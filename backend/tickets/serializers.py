from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ('id', 'created_at')

    def validate_category(self, value: str) -> str:
        valid = [c[0] for c in Ticket.Category.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate_priority(self, value: str) -> str:
        valid = [p[0] for p in Ticket.Priority.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid priority. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate_status(self, value: str) -> str:
        valid = [s[0] for s in Ticket.Status.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid)}"
            )
        return value


class TicketPartialUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ('status', 'category', 'priority')

    def validate_category(self, value: str) -> str:
        valid = [c[0] for c in Ticket.Category.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate_priority(self, value: str) -> str:
        valid = [p[0] for p in Ticket.Priority.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid priority. Must be one of: {', '.join(valid)}"
            )
        return value

    def validate_status(self, value: str) -> str:
        valid = [s[0] for s in Ticket.Status.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status. Must be one of: {', '.join(valid)}"
            )
        return value


class ClassifyRequestSerializer(serializers.Serializer):
    description = serializers.CharField(min_length=1)


class ClassifyResponseSerializer(serializers.Serializer):
    suggested_category = serializers.CharField()
    suggested_priority = serializers.CharField()


class StatsSerializer(serializers.Serializer):
    total_tickets = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    avg_tickets_per_day = serializers.FloatField()
    priority_breakdown = serializers.DictField(child=serializers.IntegerField())
    category_breakdown = serializers.DictField(child=serializers.IntegerField())
