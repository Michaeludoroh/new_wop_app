import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/homepage/homepage_relative_time.dart';

void main() {
  final now = DateTime.utc(2026, 8, 19, 12);

  test('formats recent timestamps as relative labels', () {
    expect(formatRelativeTimestamp(now.subtract(const Duration(minutes: 4)), now), '4m ago');
    expect(formatRelativeTimestamp(now.subtract(const Duration(hours: 3)), now), '3h ago');
    expect(formatRelativeTimestamp(now.add(const Duration(hours: 2)), now), 'In 2h');
  });

  test('builds a readable event schedule without intl', () {
    expect(
      formatEventSchedule(DateTime.utc(2026, 8, 22, 10, 5).toLocal()),
      contains('Aug'),
    );
  });

  test('strips markup from content previews', () {
    expect(previewText('<p>Hello   world</p>'), 'Hello world');
  });
}
