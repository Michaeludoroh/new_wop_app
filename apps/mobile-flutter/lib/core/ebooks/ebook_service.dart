import 'package:dio/dio.dart';



import '../auth/auth_service.dart';

import '../auth/token_storage_service.dart';

import 'models/ebook_models.dart';



class EbookService {

  EbookService({

    Dio? dio,

    TokenStorageService? tokenStorageService,

  })  : _dio = dio ??

            Dio(

              BaseOptions(

                baseUrl: AuthApiConfig.baseUrl,

                connectTimeout: const Duration(seconds: 15),

                receiveTimeout: const Duration(seconds: 20),

                sendTimeout: const Duration(seconds: 20),

                headers: {'Content-Type': 'application/json'},

              ),

            ),

        _tokenStorageService = tokenStorageService ?? TokenStorageService();



  final Dio _dio;

  final TokenStorageService _tokenStorageService;



  Future<EbookListResponse> getEbooks({

    String? search,

    String? category,

    bool? featured,

    bool? recent,

  }) async {

    final response = await _authorizedGet(

      '/ebooks',

      queryParameters: {

        if (search != null && search.isNotEmpty) 'search': search,

        if (category != null && category.isNotEmpty) 'category': category,

        if (featured != null) 'featured': '$featured',

        if (recent != null) 'recent': '$recent',

      },

    );



    return EbookListResponse.fromJson(_asMap(response.data));

  }



  Future<EbookDetailsResponse> getEbookDetails(String id) async {

    final response = await _authorizedGet('/ebooks/$id');

    return EbookDetailsResponse.fromJson(_asMap(response.data));

  }



  Future<LibraryResponse> getMyLibrary() async {

    final response = await _authorizedGet('/library');

    return LibraryResponse.fromJson(_asMap(response.data));

  }



  Future<RecentlyReadResponse> getRecentlyRead({int limit = 10}) async {

    final response = await _authorizedGet(

      '/ebooks/recently-read',

      queryParameters: {'limit': '$limit'},

    );

    return RecentlyReadResponse.fromJson(_asMap(response.data));

  }



  Future<ReadingProgressResponse> getReadingProgress(String ebookId) async {

    final response = await _authorizedGet('/ebooks/$ebookId/progress');

    return ReadingProgressResponse.fromJson(_asMap(response.data));

  }



  Future<PurchaseResponse> purchaseEbook({

    required String ebookId,

    String? paymentReference,

  }) async {

    final response = await _authorizedPost(

      '/ebooks/purchase',

      data: {

        'ebookId': ebookId,

        if (paymentReference != null) 'paymentReference': paymentReference,

      },

    );



    return PurchaseResponse.fromJson(_asMap(response.data));

  }



  Future<EbookCheckoutResult> initiateEbookCheckout({

    required String ebookId,

  }) async {

    final response = await _authorizedPost(

      '/payments/checkout/ebook',

      data: {'ebookId': ebookId},

    );



    return EbookCheckoutResult.fromJson(_asMap(response.data));

  }



  Future<EbookPaymentStatusResult> getPaymentStatus(String providerReference) async {

    final response = await _authorizedGet(

      '/payments/status',

      queryParameters: {'providerReference': providerReference},

    );



    return EbookPaymentStatusResult.fromJson(_asMap(response.data));

  }



  Future<AccessResponse> getAccess(String ebookId) async {

    final response = await _authorizedGet('/ebooks/$ebookId/access');

    return AccessResponse.fromJson(_asMap(response.data));

  }



  Future<ReadingProgressResponse> updateReadingProgress({

    required String ebookId,

    required int currentPage,

    int? totalPages,

    double? progressPct,

    List<int>? bookmarkPages,

    bool? downloaded,

  }) async {

    final response = await _authorizedPost(

      '/ebooks/$ebookId/progress',

      data: {

        'currentPage': currentPage,

        if (totalPages != null) 'totalPages': totalPages,

        if (progressPct != null) 'progressPct': progressPct,

        if (bookmarkPages != null) 'bookmarkPages': bookmarkPages,

        if (downloaded != null) 'downloaded': downloaded,

      },

    );

    return ReadingProgressResponse.fromJson(_asMap(response.data));

  }



  Future<void> recordDownload(String ebookId) async {

    await _authorizedPost('/ebooks/$ebookId/download');

  }



  Future<Response<List<int>>> downloadPdfBytes(String contentUrl) async {

    final isStreamUrl = contentUrl.contains('/ebooks/') && contentUrl.contains('/stream');

    final accessToken = await _tokenStorageService.getAccessToken();

    return _dio.get<List<int>>(

      contentUrl,

      options: Options(

        responseType: ResponseType.bytes,

        headers: isStreamUrl

            ? null

            : contentUrl.contains('/api/v1/')

                ? {'Authorization': 'Bearer ${accessToken ?? ''}'}

                : null,

      ),

    );

  }



  Future<Response<dynamic>> _authorizedGet(

    String path, {

    Map<String, dynamic>? queryParameters,

  }) async {

    final accessToken = await _tokenStorageService.getAccessToken();

    return _dio.get<dynamic>(

      path,

      queryParameters: queryParameters,

      options: Options(

        headers: {'Authorization': 'Bearer ${accessToken ?? ''}'},

      ),

    );

  }



  Future<Response<dynamic>> _authorizedPost(

    String path, {

    Object? data,

  }) async {

    final accessToken = await _tokenStorageService.getAccessToken();

    return _dio.post<dynamic>(

      path,

      data: data,

      options: Options(

        headers: {'Authorization': 'Bearer ${accessToken ?? ''}'},

      ),

    );

  }



  Map<String, dynamic> _asMap(dynamic value) {

    if (value is Map<String, dynamic>) {

      return value;

    }

    if (value is Map) {

      return value.map((key, val) => MapEntry(key.toString(), val));

    }

    return <String, dynamic>{};

  }

}


