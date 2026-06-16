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

      title: (json['title'] ?? '') as String,

      author: (json['author'] ?? '') as String,

      description: (json['description'] ?? '') as String,

      category: (json['category'] ?? '') as String,

      coverImage: (json['coverImage'] ?? json['coverUrl'] ?? '') as String,

      price: _parseDouble(json['price']),

      isPremium: (json['isPremium'] ?? false) as bool,

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

    if (value is List) {

      return value

          .whereType<Map>()

          .map((e) =>

              EbookItem.fromJson(e.map((k, v) => MapEntry(k.toString(), v))))

          .toList();

    }

    return <EbookItem>[];

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

    if (value is List) {

      return value

          .whereType<Map>()

          .map((e) =>

              EbookItem.fromJson(e.map((k, v) => MapEntry(k.toString(), v))))

          .toList();

    }

    return <EbookItem>[];

  }



  static List<ReadingProgressItem> _parseProgress(dynamic value) {

    if (value is List) {

      return value

          .whereType<Map>()

          .map((e) => ReadingProgressItem.fromJson(

              e.map((k, v) => MapEntry(k.toString(), v))))

          .toList();

    }

    return <ReadingProgressItem>[];

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

    return AccessResponse(

      authorized: (json['authorized'] ?? false) as bool,

      reason: (json['reason'] ?? '') as String,

      fileUrl: json['fileUrl']?.toString(),

      streamUrl: json['streamUrl']?.toString(),

      streamToken: json['streamToken'] as String?,

      expiresInSeconds: json['expiresInSeconds'] as int?,

    );

  }

}



class PurchaseResponse {

  PurchaseResponse({

    required this.message,

    this.data,

  });



  final String message;

  final Map<String, dynamic>? data;



  factory PurchaseResponse.fromJson(Map<String, dynamic> json) {

    return PurchaseResponse(

      message: (json['message'] ?? '') as String,

      data: json['data'] is Map

          ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))

          : null,

    );

  }

}



class EbookCheckoutResult {

  EbookCheckoutResult({

    required this.checkoutUrl,

    required this.providerReference,

  });



  final String checkoutUrl;

  final String providerReference;



  factory EbookCheckoutResult.fromJson(Map<String, dynamic> json) {

    final data = json['data'] is Map

        ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))

        : json;

    return EbookCheckoutResult(

      checkoutUrl: (data['checkoutUrl'] ?? '').toString(),

      providerReference: (data['providerReference'] ?? '').toString(),

    );

  }

}



class EbookPaymentStatusResult {

  EbookPaymentStatusResult({

    required this.providerReference,

    required this.status,

    this.failureMessage,

  });



  final String providerReference;

  final String status;

  final String? failureMessage;



  bool get isSuccessful => status.toUpperCase() == 'SUCCESS';

  bool get isFailed => status.toUpperCase() == 'FAILED';



  factory EbookPaymentStatusResult.fromJson(Map<String, dynamic> json) {

    final data = json['data'] is Map

        ? (json['data'] as Map).map((k, v) => MapEntry(k.toString(), v))

        : json;

    return EbookPaymentStatusResult(

      providerReference: (data['providerReference'] ?? '').toString(),

      status: (data['status'] ?? 'PENDING').toString(),

      failureMessage: data['failureMessage']?.toString(),

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


