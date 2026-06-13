# aura_api_sdk.model.Checkout

## Load the model package
```dart
import 'package:aura_api_sdk/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **String** |  | [optional] 
**customerId** | **String** |  | [optional] 
**couponCode** | **String** |  | [optional] 
**address** | [**CheckoutAddress**](CheckoutAddress.md) |  | [optional] 
**shippingAddressJson** | **Map<String, Object>** |  | [optional] [default to const {}]
**billingAddressJson** | **Map<String, Object>** |  | [optional] [default to const {}]
**items** | [**List<CheckoutItemsInner>**](CheckoutItemsInner.md) |  | [default to const []]
**affiliateId** | **String** |  | [optional] 
**utmSource** | **String** |  | [optional] 
**utmMedium** | **String** |  | [optional] 
**utmCampaign** | **String** |  | [optional] 
**acceptsMarketing** | **bool** |  | [optional] 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


