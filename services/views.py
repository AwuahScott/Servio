import json
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from .models import ServiceProvider, JoinRequest


# ── Serve the main page ──────────────────────────────────────
def home(request):
    return render(request, 'index.html')


# ── Return providers as JSON to JavaScript ───────────────────
from django.core.paginator import Paginator

def get_providers(request):
    region   = request.GET.get('region',   '')
    district = request.GET.get('district', '')
    category = request.GET.get('category', '')
    search   = request.GET.get('search',   '')
    page     = request.GET.get('page', 1)        # ← NEW

    providers = ServiceProvider.objects.filter(is_active=True)

    if region:
        providers = providers.filter(region=region)
    if district:
        providers = providers.filter(district__icontains=district)
    if category and category != 'all':
        providers = providers.filter(category=category)
    if search:
        from django.db.models import Q
        providers = providers.filter(
            Q(service__icontains=search) |
            Q(name__icontains=search)    |
            Q(tags__icontains=search)
        )

    # Paginate — 10 per page
    paginator    = Paginator(providers, 10)
    page_obj     = paginator.get_page(page)

    data = []
    for p in page_obj:
        data.append({
            'id':          p.id,
            'name':        p.name,
            'service':     p.service,
            'category':    p.category,
            'region':      p.region,
            'district':    p.district,
            'town':        p.town,
            'phone':       p.phone,
            'whatsapp':    p.whatsapp or p.phone,
            'description': p.description,
            'tags':        p.tags_list(),
            'verified':    p.verified,
            'stars':       5,
            'initials':    p.initials(),
            'photo':       p.photo_url(),
        })

    return JsonResponse({
        'providers':    data,
        'total':        paginator.count,
        'total_pages':  paginator.num_pages,
        'current_page': page_obj.number,
        'has_next':     page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })


# ── Handle the join form ─────────────────────────────────────
@csrf_exempt
def submit_join(request):
    if request.method != 'POST':
        return JsonResponse(
            {'success': False, 'message': 'Invalid request'},
            status=405
        )

    try:
        body    = json.loads(request.body)
        name    = body.get('name',    '').strip()
        phone   = body.get('phone',   '').strip()
        service = body.get('service', '').strip()
        region  = body.get('region',  '').strip()
        town    = body.get('town',    '').strip()

        # Validate required fields
        if not name or not phone or not service:
            return JsonResponse({
                'success': False,
                'message': 'Please fill in name, phone and service'
            }, status=400)

        # Save to database
        JoinRequest.objects.create(
            name    = name,
            phone   = phone,
            service = service,
            region  = region,
            town    = town,
        )

        print(f"NEW JOIN REQUEST: {name} | {service} | {phone}")

        return JsonResponse({
            'success': True,
            'message': f'Thank you {name}! We will contact you on {phone} soon.'
        })

    except Exception as e:
        print(f"Error in submit_join: {e}")
        return JsonResponse({
            'success': False,
            'message': 'Something went wrong. Please try again.'
        }, status=500)
    

    from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required


# ── Provider Login Page ───────────────────────────────────────
def provider_login(request):

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            return render(request, 'login.html', {
                'error': 'Wrong username or password. Try again.'
            })

    return render(request, 'login.html')


# ── Provider Dashboard ────────────────────────────────────────
@login_required(login_url='/login/')
def dashboard(request):

    # Get the provider profile for the logged in user
    try:
        provider = request.user.provider_profile
    except ServiceProvider.DoesNotExist:
        logout(request)
        return redirect('login')

    message = None

    if request.method == 'POST':

        # Update profile from form
        provider.service     = request.POST.get('service', provider.service)
        provider.category    = request.POST.get('category', provider.category)
        provider.description = request.POST.get('description', provider.description)
        provider.tags        = request.POST.get('tags', provider.tags)
        provider.whatsapp    = request.POST.get('whatsapp', provider.whatsapp)
        provider.town        = request.POST.get('town', provider.town)

        # Handle photo upload
        if 'photo' in request.FILES:
            provider.photo = request.FILES['photo']

        provider.save()
        message = 'Profile updated successfully!'

    return render(request, 'dashboard.html', {
        'provider': provider,
        'message':  message,
        'categories': ServiceProvider.CATEGORY_CHOICES,
        'regions':    ServiceProvider.REGION_CHOICES,
    })


# ── Logout ────────────────────────────────────────────────────
def provider_logout(request):
    logout(request)
    return redirect('home')