import logging
from datetime import timedelta

from django.db.models import Avg, Count, F, FloatField, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status
from rest_framework.decorators import api_view
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import TicketFilter
from .llm_service import classify_ticket
from .models import Ticket
from .serializers import (
    ClassifyRequestSerializer,
    TicketPartialUpdateSerializer,
    TicketSerializer,
)

logger = logging.getLogger(__name__)


class TicketListCreateView(ListCreateAPIView):
    """
    GET  /api/tickets/  - list tickets (newest first) with filters + search
    POST /api/tickets/  - create a new ticket
    """
    serializer_class = TicketSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TicketFilter
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return Ticket.objects.all()

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TicketDetailView(RetrieveUpdateAPIView):
    """
    PATCH /api/tickets/<id>/ - partial update (status, category, priority)
    """
    queryset = Ticket.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return TicketPartialUpdateSerializer
        return TicketSerializer

    def update(self, request: Request, *args, **kwargs) -> Response:
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class TicketStatsView(APIView):
    """
    GET /api/tickets/stats/ - aggregated statistics (DB-level, no Python loops)
    """

    def get(self, request: Request) -> Response:
        qs = Ticket.objects.all()

        total_tickets = qs.count()
        open_tickets = qs.filter(status=Ticket.Status.OPEN).count()

        # Average tickets per day using DB-level aggregation
        daily_counts = (
            qs.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .aggregate(avg=Avg('count', output_field=FloatField()))
        )
        avg_tickets_per_day = round(daily_counts['avg'] or 0.0, 1)

        # Priority breakdown - DB aggregation
        priority_qs = (
            qs.values('priority')
            .annotate(count=Count('id'))
        )
        priority_breakdown = {row['priority']: row['count'] for row in priority_qs}

        # Category breakdown - DB aggregation
        category_qs = (
            qs.values('category')
            .annotate(count=Count('id'))
        )
        category_breakdown = {row['category']: row['count'] for row in category_qs}

        return Response({
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'avg_tickets_per_day': avg_tickets_per_day,
            'priority_breakdown': priority_breakdown,
            'category_breakdown': category_breakdown,
        })


class ClassifyView(APIView):
    """
    POST /api/tickets/classify/ - LLM-powered ticket classification
    """

    def post(self, request: Request) -> Response:
        serializer = ClassifyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        description = serializer.validated_data['description']
        result = classify_ticket(description)
        return Response(result, status=status.HTTP_200_OK)
