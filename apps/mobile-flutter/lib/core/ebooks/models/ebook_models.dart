import '../../http/public_asset_url.dart';

class EbookItem {

  EbookItem({

    required this.id,

    required this.title,

    required this.author,

    required this.description,

    required this.category,

    required this.coverImage,

    required this.price,

    required this.isPremium,

    this.pdfPath,

    this.fileUrl,

    this.createdAt,

  });



  final String id;

  final String title;

  final String author;

  final String description;

  final String category;

  final String coverImage;

  final double price;

  final bool isPremium;

  final String? pdfPath;

  final String? fileUrl;

  final DateTime? createdAt;



  String get readingUrl => fileUrl ?? pdfPath ?? '';



  factory EbookItem.fromJson(Map<String, dynamic> json) {

    final fileUrl = (json['fileUrl'] ?? json['pdfPath'])?.toString();

    return EbookItem(

      id: (json['id'] ?? '').toString(),

      title: (json['title'] ?? '').toString(),
      author: (json['author'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      coverImage: rewritePublicAssetUrl(
        (json['coverImage'] ?? json['coverUrl'] ?? '').toString(),
      ),

      price: _parseDouble(json['price']),

      isPremium: json['isPremium'] == true,

      pdfPath: fileUrl,

      fileUrl: fileUrl,

      createdAt: _parseDate(json['createdAt']),

    );

  }



  static double _parseDouble(dynamic value) {

    if (value is num) return value.toDouble();

    if (value is String) return double.tryParse(value) ?? 0;

    return 0;

  }



  static DateTime? _parseDate(dynamic value) {

    if (value is String) return DateTime.tryParse(value)?.toLocal();

    return null;

  }

}



class EbookListResponse {

  EbookListResponse({

    required this.data,

    required this.featured,

    required this.recent,

  });



  final List<EbookItem> data;

  final List<EbookItem> featured;

  final List<EbookItem> recent;



  factory EbookListResponse.fromJson(Map<String, dynamic> json) {

    return EbookListResponse(

      data: _parseList(json['data']),

      featured: _parseList(json['featured']),

      recent: _parseList(json['recent']),

    );

  }



  static List<EbookItem> _parseList(dynamic value) {
    if (value is! List) {
      return <EbookItem>[];
    }
    final items = <EbookItem>[];
    for (final raw in value) {
      if (raw is! Map) {
        continue;
      }
      try {
        final item = EbookItem.fromJson(
          raw.map((k, v) => MapEntry(k.toString(), v)),
        );
        if (item.id.isEmpty) {
          continue;
        }
        items.add(item);
      } catch (_) {
        continue;
      }
    }
    return items;
  }

}



class EbookDetailsResponse {

  EbookDetailsResponse({required this.data});



  final EbookItem data;



  factory EbookDetailsResponse.fromJson(Map<String, dynamic> json) {

    final data = json['data'];

    if (data is Map) {

      return EbookDetailsResponse(

        data: EbookItem.fromJson(

          data.map((k, v) => MapEntry(k.toString(), v)),

        ),

      );

    }

    return EbookDetailsResponse(

      data: EbookItem.fromJson(<String, dynamic>{}),

    );

  }

}



class LibraryResponse {

  LibraryResponse({

    required this.purchased,

    required this.subscription,

    required this.continueReading,

    required this.downloads,

    required this.history,

    required this.recentlyRead,

  });



  final List<EbookItem> purchased;

  final List<EbookItem> subscription;

  final List<ReadingProgressItem> continueReading;

  final List<ReadingProgressItem> downloads;

  final List<ReadingProgressItem> history;

  final List<ReadingProgressItem> recentlyRead;



  factory LibraryResponse.fromJson(Map<String, dynamic> json) {

    return LibraryResponse(

      purchased: _parseEbooks(json['purchased']),

      subscription: _parseEbooks(json['subscription']),

      continueReading: _parseProgress(json['continueReading']),

      downloads: _parseProgress(json['downloads']),

      history: _parseProgress(json['history']),

      recentlyRead: _parseProgress(json['recentlyRead'] ?? json['history']),

    );

  }



  static List<EbookItem> _parseEbooks(dynamic value) {
    return EbookListResponse._parseList(value);
  }

  static List<ReadingProgressItem> _parseProgress(dynamic value) {
    if (value is! List) {
      return <ReadingProgressItem>[];
    }
    final items = <ReadingProgressItem>[];
    for (final raw in value) {
      if (raw is! Map) {
        continue;
      }
      try {
        items.add(
          ReadingProgressItem.fromJson(
            raw.map((k, v) => MapEntry(k.toString(), v)),
          ),
        );
      } catch (_) {
        continue;
      }
    }
    return items;
  }

}



class ReadingProgressItem {

  ReadingProgressItem({

    required this.ebookId,

    required this.currentPage,

    this.totalPages,

    this.progressPct,

    this.bookmarkPages,

    required this.downloaded,

    this.lastReadAt,

    this.completed = false,

    this.ebook,

  });



  final String ebookId;

  final int currentPage;

  final int? totalPages;

  final double? progressPct;

  final List<int>? bookmarkPages;

  final bool downloaded;

  final DateTime? lastReadAt;

  final bool completed;

  final EbookItem? ebook;



  factory ReadingProgressItem.fromJson(Map<String, dynamic> json) {

    final bookmarkRaw = json['bookmarkPages'];

    return ReadingProgressItem(

      ebookId: (json['ebookId'] ?? '').toString(),

      currentPage: (json['currentPage'] ?? 0) as int,

      totalPages: json['totalPages'] as int?,

      progressPct: (json['progressPct'] as num?)?.toDouble(),

      bookmarkPages: bookmarkRaw is List

          ? bookmarkRaw.map((e) => int.tryParse('$e') ?? 0).toList()

          : null,

      downloaded: (json['downloaded'] ?? false) as bool,

      lastReadAt: json['lastReadAt'] is String

          ? DateTime.tryParse(json['lastReadAt'] as String)?.toLocal()

          : null,

      completed: (json['completed'] ?? false) as bool,

      ebook: json['ebook'] is Map

          ? EbookItem.fromJson(

              (json['ebook'] as Map).map((k, v) => MapEntry(k.toString(), v)),

            )

          : null,

    );

  }

}



class AccessResponse {

  AccessResponse({

    required this.authorized,

    required this.reason,

    this.fileUrl,

    this.streamUrl,

    this.streamToken,

    this.expiresInSeconds,

  });



  final bool authorized;

  final String reason;

  final String? fileUrl;

  final String? streamUrl;

  final String? streamToken;

  final int? expiresInSeconds;



  String get contentUrl => streamUrl ?? fileUrl ?? '';



  factory AccessResponse.fromJson(Map<String, dynamic> json) {
    final source = json['authorized'] != null || json['streamUrl'] != null
        ? json
        : (json['data'] is Map
            ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))
            : json);
    final streamUrl = rewritePublicAssetUrlOrNull(source['streamUrl']?.toString());
    final fileUrl = rewritePublicAssetUrlOrNull(source['fileUrl']?.toString());
    return AccessResponse(
      authorized: source['authorized'] == true,
      reason: source['reason']?.toString() ?? '',
      fileUrl: fileUrl,
      streamUrl: streamUrl,
      streamToken: source['streamToken']?.toString(),
      expiresInSeconds: source['expiresInSeconds'] is num
          ? (source['expiresInSeconds'] as num).toInt()
          : int.tryParse(source['expiresInSeconds']?.toString() ?? ''),
    );
  }

}



class RecentlyReadResponse {

  RecentlyReadResponse({required this.data});



  final List<ReadingProgressItem> data;



  factory RecentlyReadResponse.fromJson(Map<String, dynamic> json) {

    return RecentlyReadResponse(

      data: LibraryResponse._parseProgress(json['data']),

    );

  }

}



class ReadingProgressResponse {

  ReadingProgressResponse({this.data});



  final ReadingProgressItem? data;



  factory ReadingProgressResponse.fromJson(Map<String, dynamic> json) {

    final data = json['data'];

    if (data is Map) {

      return ReadingProgressResponse(

        data: ReadingProgressItem.fromJson(

          data.map((k, v) => MapEntry(k.toString(), v)),

        ),

      );

    }

    return ReadingProgressResponse(data: null);

  }

}


