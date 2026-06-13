//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;


class DefaultApi {
  DefaultApi([ApiClient? apiClient]) : apiClient = apiClient ?? defaultApiClient;

  final ApiClient apiClient;

  /// Submit a guest order
  ///
  /// Guest checkout
  ///
  /// Note: This method returns the HTTP [Response].
  ///
  /// Parameters:
  ///
  /// * [Checkout] checkout:
  Future<Response> apiCheckoutGuestPostWithHttpInfo({ Checkout? checkout, }) async {
    // ignore: prefer_const_declarations
    final path = r'/api/checkout/guest';

    // ignore: prefer_final_locals
    Object? postBody = checkout;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>['application/json'];


    return apiClient.invokeAPI(
      path,
      'POST',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// Submit a guest order
  ///
  /// Guest checkout
  ///
  /// Parameters:
  ///
  /// * [Checkout] checkout:
  Future<ApiCheckoutGuestPost200Response?> apiCheckoutGuestPost({ Checkout? checkout, }) async {
    final response = await apiCheckoutGuestPostWithHttpInfo( checkout: checkout, );
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      return await apiClient.deserializeAsync(await _decodeBodyBytes(response), 'ApiCheckoutGuestPost200Response',) as ApiCheckoutGuestPost200Response;
    
    }
    return null;
  }

  /// List products
  ///
  /// Get all products
  ///
  /// Note: This method returns the HTTP [Response].
  Future<Response> apiProductsGetWithHttpInfo() async {
    // ignore: prefer_const_declarations
    final path = r'/api/products';

    // ignore: prefer_final_locals
    Object? postBody;

    final queryParams = <QueryParam>[];
    final headerParams = <String, String>{};
    final formParams = <String, String>{};

    const contentTypes = <String>[];


    return apiClient.invokeAPI(
      path,
      'GET',
      queryParams,
      postBody,
      headerParams,
      formParams,
      contentTypes.isEmpty ? null : contentTypes.first,
    );
  }

  /// List products
  ///
  /// Get all products
  Future<List<Product>?> apiProductsGet() async {
    final response = await apiProductsGetWithHttpInfo();
    if (response.statusCode >= HttpStatus.badRequest) {
      throw ApiException(response.statusCode, await _decodeBodyBytes(response));
    }
    // When a remote server returns no body with a status of 204, we shall not decode it.
    // At the time of writing this, `dart:convert` will throw an "Unexpected end of input"
    // FormatException when trying to decode an empty string.
    if (response.body.isNotEmpty && response.statusCode != HttpStatus.noContent) {
      final responseBody = await _decodeBodyBytes(response);
      return (await apiClient.deserializeAsync(responseBody, 'List<Product>') as List)
        .cast<Product>()
        .toList(growable: false);

    }
    return null;
  }
}
