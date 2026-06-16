import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/programs/program_service.dart';
import 'package:ministry_mobile/core/programs/models/program_models.dart';
import 'package:ministry_mobile/screens/programs_screen.dart';

class _FakeProgramService extends ProgramService {
  @override
  Future<ProgramListResponse> getPrograms({
    String? search,
    String? category,
    bool? featured,
    int limit = 20,
    int offset = 0,
  }) async {
    return const ProgramListResponse(data: [], total: 0, limit: 20, offset: 0);
  }

  @override
  Future<ProgramListResponse> getFeaturedPrograms({int limit = 8}) async {
    return const ProgramListResponse(data: [], total: 0, limit: 8, offset: 0);
  }
}

void main() {
  testWidgets('renders empty programs state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ProgramsScreen(service: _FakeProgramService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('Programs'), findsOneWidget);
    expect(find.text('All Programs'), findsOneWidget);
    expect(find.text('No programs found.'), findsOneWidget);
  });
}
