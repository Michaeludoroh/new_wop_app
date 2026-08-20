String formatRelativeTimestamp(DateTime? value, DateTime now) {
  if (value == null) return '';
  final local = value.toLocal();
  final difference = now.difference(local);

  if (difference.isNegative) {
    final ahead = local.difference(now);
    if (ahead.inMinutes < 60) return 'In ${ahead.inMinutes.clamp(1, 59)}m';
    if (ahead.inHours < 24) return 'In ${ahead.inHours}h';
    if (ahead.inDays < 7) return 'In ${ahead.inDays}d';
    return _dateLabel(local);
  }

  if (difference.inMinutes < 1) return 'Just now';
  if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
  if (difference.inHours < 24) return '${difference.inHours}h ago';
  if (difference.inDays < 7) return '${difference.inDays}d ago';
  return _dateLabel(local);
}

String formatEventSchedule(DateTime start) {
  final local = start.toLocal();
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final weekday = weekdays[(local.weekday - 1).clamp(0, 6)];
  final month = months[(local.month - 1).clamp(0, 11)];
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '$weekday ${local.day} $month · $hour:$minute';
}

String _dateLabel(DateTime local) {
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}

String previewText(String? raw, {int maxChars = 140}) {
  if (raw == null) return '';
  final stripped = raw.replaceAll(RegExp(r'<[^>]*>'), ' ').replaceAll(RegExp(r'\s+'), ' ').trim();
  if (stripped.length <= maxChars) return stripped;
  return '${stripped.substring(0, maxChars).trimRight()}…';
}
