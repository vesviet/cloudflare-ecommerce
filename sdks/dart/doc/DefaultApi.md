# aura_api_sdk.api.DefaultApi

## Load the API package
```dart
import 'package:aura_api_sdk/api.dart';
```

All URIs are relative to *https://api.aura.store*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiCheckoutGuestPost**](DefaultApi.md#apicheckoutguestpost) | **POST** /api/checkout/guest | Submit a guest order
[**apiProductsGet**](DefaultApi.md#apiproductsget) | **GET** /api/products | List products


# **apiCheckoutGuestPost**
> ApiCheckoutGuestPost200Response apiCheckoutGuestPost(guestCheckout)

Submit a guest order

Guest checkout

### Example
```dart
import 'package:aura_api_sdk/api.dart';

final api_instance = DefaultApi();
final guestCheckout = GuestCheckout(); // GuestCheckout | 

try {
    final result = api_instance.apiCheckoutGuestPost(guestCheckout);
    print(result);
} catch (e) {
    print('Exception when calling DefaultApi->apiCheckoutGuestPost: $e\n');
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **guestCheckout** | [**GuestCheckout**](GuestCheckout.md)|  | [optional] 

### Return type

[**ApiCheckoutGuestPost200Response**](ApiCheckoutGuestPost200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiProductsGet**
> List<Product> apiProductsGet()

List products

Get all products

### Example
```dart
import 'package:aura_api_sdk/api.dart';

final api_instance = DefaultApi();

try {
    final result = api_instance.apiProductsGet();
    print(result);
} catch (e) {
    print('Exception when calling DefaultApi->apiProductsGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**List<Product>**](Product.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

