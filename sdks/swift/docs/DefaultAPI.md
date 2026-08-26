# DefaultAPI

All URIs are relative to *https://api.aura.store*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiCheckoutGuestPost**](DefaultAPI.md#apicheckoutguestpost) | **POST** /api/checkout/guest | Submit a guest order
[**apiProductsGet**](DefaultAPI.md#apiproductsget) | **GET** /api/products | List products


# **apiCheckoutGuestPost**
```swift
    open class func apiCheckoutGuestPost(checkout: Checkout? = nil, completion: @escaping (_ data: ApiCheckoutGuestPost200Response?, _ error: Error?) -> Void)
```

Submit a guest order

Guest checkout

### Example
```swift
// The following code samples are still beta. For any issue, please report via http://github.com/OpenAPITools/openapi-generator/issues/new
import AuraApiSDK

let checkout = Checkout(email: "email_example", customerId: 123, couponCode: "couponCode_example", locationId: "locationId_example", address: Checkout_address(fullname: "fullname_example", address: "address_example", zipcode: "zipcode_example"), shippingAddressJson: "TODO", billingAddressJson: "TODO", items: [Checkout_items_inner(variationId: "variationId_example", id: "id_example", quantity: 123)], affiliateId: "affiliateId_example", utmSource: "utmSource_example", utmMedium: "utmMedium_example", utmCampaign: "utmCampaign_example", acceptsMarketing: Checkout_accepts_marketing(), turnstileToken: "turnstileToken_example", redeemPoints: 123, b2bCompany: "b2bCompany_example", b2bVatId: "b2bVatId_example") // Checkout |  (optional)

// Submit a guest order
DefaultAPI.apiCheckoutGuestPost(checkout: checkout) { (response, error) in
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
 **checkout** | [**Checkout**](Checkout.md) |  | [optional] 

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

