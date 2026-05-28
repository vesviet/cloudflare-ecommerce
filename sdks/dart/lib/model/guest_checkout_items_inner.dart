//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class GuestCheckoutItemsInner {
  /// Returns a new [GuestCheckoutItemsInner] instance.
  GuestCheckoutItemsInner({
    required this.variationId,
    required this.quantity,
  });

  String variationId;

  /// Minimum value: 0
  int quantity;

  @override
  bool operator ==(Object other) => identical(this, other) || other is GuestCheckoutItemsInner &&
    other.variationId == variationId &&
    other.quantity == quantity;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (variationId.hashCode) +
    (quantity.hashCode);

  @override
  String toString() => 'GuestCheckoutItemsInner[variationId=$variationId, quantity=$quantity]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'variation_id'] = this.variationId;
      json[r'quantity'] = this.quantity;
    return json;
  }

  /// Returns a new [GuestCheckoutItemsInner] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static GuestCheckoutItemsInner? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'variation_id'), 'Required key "GuestCheckoutItemsInner[variation_id]" is missing from JSON.');
        assert(json[r'variation_id'] != null, 'Required key "GuestCheckoutItemsInner[variation_id]" has a null value in JSON.');
        assert(json.containsKey(r'quantity'), 'Required key "GuestCheckoutItemsInner[quantity]" is missing from JSON.');
        assert(json[r'quantity'] != null, 'Required key "GuestCheckoutItemsInner[quantity]" has a null value in JSON.');
        return true;
      }());

      return GuestCheckoutItemsInner(
        variationId: mapValueOfType<String>(json, r'variation_id')!,
        quantity: mapValueOfType<int>(json, r'quantity')!,
      );
    }
    return null;
  }

  static List<GuestCheckoutItemsInner> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <GuestCheckoutItemsInner>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = GuestCheckoutItemsInner.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, GuestCheckoutItemsInner> mapFromJson(dynamic json) {
    final map = <String, GuestCheckoutItemsInner>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = GuestCheckoutItemsInner.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of GuestCheckoutItemsInner-objects as value to a dart map
  static Map<String, List<GuestCheckoutItemsInner>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<GuestCheckoutItemsInner>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = GuestCheckoutItemsInner.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'variation_id',
    'quantity',
  };
}

