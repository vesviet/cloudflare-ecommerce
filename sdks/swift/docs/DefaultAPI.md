# DefaultAPI

All URIs are relative to *https://api.aura.store*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiCheckoutGuestPost**](DefaultAPI.md#apicheckoutguestpost) | **POST** /api/checkout/guest | Submit a guest order
[**apiProductsGet**](DefaultAPI.md#apiproductsget) | **GET** /api/products | List products


# **apiCheckoutGuestPost**
```swift
    open class func apiCheckoutGuestPost(guestCheckout: GuestCheckout? = nil, completion: @escaping (_ data: ApiCheckoutGuestPost200Response?, _ error: Error?) -> Void)
```

Submit a guest order

Guest checkout

### Example
```swift
// The following code samples are still beta. For any issue, please report via http://github.com/OpenAPITools/openapi-generator/issues/new
import AuraApiSDK

let guestCheckout = GuestCheckout(email: "email_example", shippingAddress: GuestCheckout_shipping_address(fullname: "fullname_example", address: "address_example", zipcode: "zipcode_example"), items: [GuestCheckout_items_inner(variationId: 123, quantity: 123)], affiliateId: "affiliateId_example") // GuestCheckout |  (optional)

// Submit a guest order
DefaultAPI.apiCheckoutGuestPost(guestCheckout: guestCheckout) { (response, error) in
    guard error == nil else {
        print(error)
        return
    }

    if (response) {
        dump(response)
    }
}
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **guestCheckout** | [**GuestCheckout**](GuestCheckout.md) |  | [optional] 

### Return type

[**ApiCheckoutGuestPost200Response**](ApiCheckoutGuestPost200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiProductsGet**
```swift
    open class func apiProductsGet(completion: @escaping (_ data: [Product]?, _ error: Error?) -> Void)
```

List products

Get all products

### Example
```swift
// The following code samples are still beta. For any issue, please report via http://github.com/OpenAPITools/openapi-generator/issues/new
import AuraApiSDK


// List products
DefaultAPI.apiProductsGet() { (response, error) in
    guard error == nil else {
        print(error)
        return
    }

    if (response) {
        dump(response)
    }
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**[Product]**](Product.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

