import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ministry_mobile/core/ebooks/ebook_service.dart';
import 'package:ministry_mobile/core/ebooks/models/ebook_models.dart';
import 'package:ministry_mobile/screens/ebook_screen.dart';
import 'package:ministry_mobile/screens/my_library_screen.dart';

class _FakeEbookService extends EbookService {
  @override
  Future<EbookListResponse> getEbooks({
    String? search,
    String? category,
    bool? featured,
    bool? recent,
  }) async {
    return EbookListResponse(data: [], featured: [], recent: []);
  }

  @override
  Future<RecentlyReadResponse> getRecentlyRead({int limit = 10}) async {
    return RecentlyReadResponse(data: []);
  }

  @override
  Future<LibraryResponse> getMyLibrary() async {
    return LibraryResponse(
      purchased: [],
      subscription: [],
      continueReading: [],
      downloads: [],
      history: [],
      recentlyRead: [],
    );
  }
}

void main() {
  testWidgets('ebook screen renders empty catalog states', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: EbookScreen(service: _FakeEbookService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('eBooks'), findsOneWidget);
    expect(find.text('No featured eBooks yet.'), findsOneWidget);
    expect(find.text('No recent eBooks yet.'), findsOneWidget);
    expect(find.text('No eBooks match your filters.'), findsOneWidget);
  });

  testWidgets('my library screen renders empty state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MyLibraryScreen(service: _FakeEbookService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    expect(find.text('My Library'), findsOneWidget);
    expect(
      find.textContaining('Your library is empty'),
      findsOneWidget,
    );
    expect(find.text('Recently Read'), findsOneWidget);
    expect(find.text('Browse eBook Catalog'), findsOneWidget);
  });

  testWidgets('library empty state opens ebook catalog', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        routes: {
          EbookScreen.routeName: (_) => EbookScreen(service: _FakeEbookService()),
        },
        home: MyLibraryScreen(service: _FakeEbookService()),
      ),
    );

    await tester.pump();
    await tester.pump();

    await tester.tap(find.text('Browse eBook Catalog'));
    await tester.pumpAndSettle();

    expect(find.text('eBooks'), findsOneWidget);
  });
}
