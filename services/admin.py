from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.models import User
import random
import string
from .models import ServiceProvider, JoinRequest


def generate_password():
    # Creates a random 8 character password
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=8))


@admin.register(ServiceProvider)
class ServiceProviderAdmin(admin.ModelAdmin):
    list_display  = ['name', 'service', 'category', 'town', 'phone', 'verified', 'is_active']
    list_filter   = ['region', 'category', 'verified', 'is_active']
    search_fields = ['name', 'service', 'town', 'phone']
    list_editable = ['verified', 'is_active']

    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'service', 'category', 'description', 'photo']
        }),
        ('Location', {
            'fields': ['region', 'district', 'town']
        }),
        ('Contact', {
            'fields': ['phone', 'whatsapp']
        }),
        ('Tags', {
            'fields': ['tags'],
            'description': 'Comma separated. Example: Wiring, Repairs, Solar'
        }),
        ('Status', {
            'fields': ['verified', 'is_active']
        }),
    ]


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display    = ['name', 'service', 'phone', 'town', 'region', 'submitted_at', 'reviewed']
    list_filter     = ['region', 'reviewed']
    search_fields   = ['name', 'service', 'phone']
    readonly_fields = ['name', 'phone', 'service', 'region', 'town', 'submitted_at']
    actions         = ['approve_and_create_provider']

    def approve_and_create_provider(self, request, queryset):
        created = 0
        skipped = 0

        for join_req in queryset:
            if join_req.reviewed:
                skipped += 1
                continue

            # Generate username from phone number
            username = 'provider_' + join_req.phone.replace(' ', '')

            # Check if username already exists
            if User.objects.filter(username=username).exists():
                skipped += 1
                continue

            # Generate a random password
            password = generate_password()

            # Create Django User account
            user = User.objects.create_user(
                username   = username,
                password   = password,
                first_name = join_req.name,
            )

            # Create ServiceProvider linked to that user
            ServiceProvider.objects.create(
                user     = user,
                name     = join_req.name,
                service  = join_req.service,
                category = 'other',
                region   = join_req.region or 'bono',
                district = join_req.town,
                town     = join_req.town,
                phone    = join_req.phone,
                whatsapp = join_req.phone,
                verified  = True,
                is_active = True,
            )

            # Mark request as reviewed
            join_req.reviewed = True
            join_req.save()

            created += 1

            # Show login details in admin message
            # In future you will SMS or WhatsApp this to the provider
            self.message_user(
                request,
                f'✅ {join_req.name} approved! '
                f'Login: username = {username} | '
                f'password = {password} — '
                f'Send these to the provider on WhatsApp: {join_req.phone}',
                messages.SUCCESS
            )

        if skipped:
            self.message_user(
                request,
                f'⚠️ {skipped} skipped — already reviewed or username exists.',
                messages.WARNING
            )

    approve_and_create_provider.short_description = '✅ Approve and create login'