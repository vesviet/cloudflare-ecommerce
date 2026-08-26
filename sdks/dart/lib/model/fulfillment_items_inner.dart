//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class FulfillmentItemsInner {
  /// Returns a new [FulfillmentItemsInner] instance.
  FulfillmentItemsInner({
    required this.orderItemId,
    required this.quantity,
  });

  String orderItemId;

  /// Minimum value: 0
  int quantity;

  @override
  bool operator ==(Object other) => identical(this, other) || other is FulfillmentItemsInner &&
    other.orderItemId == orderItemId &&
    other.quantity == quantity;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (orderItemId.hashCode) +
    (quantity.hashCode);

  @override
  String toString() => 'FulfillmentItemsInner[orderItemId=$orderItemId, quantity=$quantity]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'order_item_id'] = this.orderItemId;
      json[r'quantity'] = this.quantity;
    return json;
  }

  /// Returns a new [FulfillmentItemsInner] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static FulfillmentItemsInner? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'order_item_id'), 'Required key "FulfillmentItemsInner[order_item_id]" is missing from JSON.');
        assert(json[r'order_item_id'] != null, 'Required key "FulfillmentItemsInner[order_item_id]" has a null value in JSON.');
        assert(json.containsKey(r'quantity'), 'Required key "FulfillmentItemsInner[quantity]" is missing from JSON.');
        assert(json[r'quantity'] != null, 'Required key "FulfillmentItemsInner[quantity]" has a null value in JSON.');
        return true;
      }());

      return FulfillmentItemsInner(
        orderItemId: mapValueOfType<String>(json, r'order_item_id')!,
        quantity: mapValueOfType<int>(json, r'quantity')!,
      );
    }
    return null;
  }

  static List<FulfillmentItemsInner> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <FulfillmentItemsInner>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = FulfillmentItemsInner.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, FulfillmentItemsInner> mapFromJson(dynamic json) {
    final map = <String, FulfillmentItemsInner>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = FulfillmentItemsInner.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of FulfillmentItemsInner-objects as value to a dart map
  static Map<String, List<FulfillmentItemsInner>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<FulfillmentItemsInner>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = FulfillmentItemsInner.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'order_item_id',
    'quantity',
  };
}

