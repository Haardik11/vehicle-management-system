from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrCallCenter(BasePermission):
    """Allows read access to any authenticated user, but restricts
    create/update/delete to admin and call_center roles."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(request.user, 'role', None) in ('admin', 'call_center')
