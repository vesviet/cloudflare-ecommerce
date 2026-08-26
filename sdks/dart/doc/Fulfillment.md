# aura_api_sdk.model.Fulfillment

## Load the model package
```dart
import 'package:aura_api_sdk/api.dart';
```

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **String** |  | 
**orderId** | **String** |  | 
**status** | **String** |  | [optional] [default to 'processing']
**trackingNumber** | **String** |  | [optional] 
**carrier** | **String** |  | [optional] 
**shippedAt** | [**DateTime**](DateTime.md) |  | [optional] 
**items** | [**List<FulfillmentItemsInner>**](FulfillmentItemsInner.md) |  | [optional] [default to const []]
**createdAt** | [**DateTime**](DateTime.md) |  | 
**updatedAt** | [**DateTime**](DateTime.md) |  | 

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


