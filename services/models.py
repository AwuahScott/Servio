from django.db import models
from django.contrib.auth.models import User


class ServiceProvider(models.Model):

    # Link to Django's built-in User model
    # This gives the provider a username and password automatically
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='provider_profile'
    )

    # Basic Info
    name        = models.CharField(max_length=200)
    service     = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Profile picture
    photo = models.ImageField(
        upload_to='providers/',
        null=True,
        blank=True
    )

    # Category
    CATEGORY_CHOICES = [
        ('electrical',   'Electrical'),
        ('plumbing',     'Plumbing'),
        ('tailoring',    'Tailoring'),
        ('mechanics',    'Mechanics'),
        ('photography',  'Photography'),
        ('carpentry',    'Carpentry'),
        ('catering',     'Catering'),
        ('cleaning',     'Cleaning'),
        ('phone-repair', 'Phone Repair'),
        ('design',       'Graphic Design'),
        ('other',        'Other'),
    ]
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='other'
    )

    # Location
    REGION_CHOICES = [
        ('bono',      'Bono Region'),
        ('bono-east', 'Bono East Region'),
    ]
    region   = models.CharField(max_length=50, choices=REGION_CHOICES, default='bono')
    district = models.CharField(max_length=100)
    town     = models.CharField(max_length=200)

    # Contact
    phone    = models.CharField(max_length=20)
    whatsapp = models.CharField(max_length=20, blank=True)

    # Tags — comma separated
    tags = models.CharField(max_length=300, blank=True)

    # Status
    verified  = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} – {self.service} ({self.town})"

    def initials(self):
        parts = self.name.strip().split()
        if len(parts) >= 2:
            return parts[0][0].upper() + parts[1][0].upper()
        return self.name[:2].upper()

    def tags_list(self):
        if self.tags:
            return [t.strip() for t in self.tags.split(',')]
        return []

    def photo_url(self):
        if self.photo:
            return self.photo.url
        return None

    class Meta:
        ordering = ['-verified', 'name']


class JoinRequest(models.Model):
    name         = models.CharField(max_length=200)
    phone        = models.CharField(max_length=20)
    service      = models.CharField(max_length=200)
    region       = models.CharField(max_length=50, blank=True)
    town         = models.CharField(max_length=200, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed     = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} – {self.service} – {self.phone}"

    class Meta:
        ordering = ['-submitted_at']