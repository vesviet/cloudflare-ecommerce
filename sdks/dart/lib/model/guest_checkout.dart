//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class GuestCheckout {
  /// Returns a new [GuestCheckout] instance.
  GuestCheckout({
    required this.email,
    required this.shippingAddress,
    this.items = const [],
    this.affiliateId,
  });

  String email;

  GuestCheckoutShippingAddress shippingAddress;

  List<GuestCheckoutItemsInner> items;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? affiliateId;

  @override
  bool operator ==(Object other) => identical(this, other) || other is GuestCheckout &&
    other.email == email &&
    other.shippingAddress == shippingAddress &&
    _deepEquality.equals(other.items, items) &&
    other.affiliateId == affiliateId;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (email.hashCode) +
    (shippingAddress.hashCode) +
    (items.hashCode) +
    (affiliateId == null ? 0 : affiliateId!.hashCode);

  @override
  String toString() => 'GuestCheckout[email=$email, shippingAddress=$shippingAddress, items=$items, affiliateId=$affiliateId]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'email'] = this.email;
      json[r'shipping_address'] = this.shippingAddress;
      json[r'items'] = this.items;
    if (this.affiliateId != null) {
      json[r'affiliate_id'] = this.affiliateId;
    } else {
      json[r'affiliate_id'] = null;
    }
    return json;
  }

  /// Returns a new [GuestCheckout] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static GuestCheckout? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'email'), 'Required key "GuestCheckout[email]" is missing from JSON.');
        assert(json[r'email'] != null, 'Required key "GuestCheckout[email]" has a null value in JSON.');
        assert(json.containsKey(r'shipping_address'), 'Required key "GuestCheckout[shipping_address]" is missing from JSON.');
        assert(json[r'shipping_address'] != null, 'Required key "GuestCheckout[shipping_address]" has a null value in JSON.');
        assert(json.containsKey(r'items'), 'Required key "GuestCheckout[items]" is missing from JSON.');
        assert(json[r'items'] != null, 'Required key "GuestCheckout[items]" has a null value in JSON.');
        return true;
      }());

      return GuestCheckout(
        email: mapValueOfType<String>(json, r'email')!,
        shippingAddress: GuestCheckoutShippingAddress.fromJson(json[r'shipping_address'])!,
        items: GuestCheckoutItemsInner.listFromJson(json[r'items']),
        affiliateId: mapValueOfType<String>(json, r'affiliate_id'),
      );
    }
    return null;
  }

  static List<GuestCheckout> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <GuestCheckout>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = GuestCheckout.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, GuestCheckout> mapFromJson(dynamic json) {
    final map = <String, GuestCheckout>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = GuestCheckout.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of GuestCheckout-objects as value to a dart map
  static Map<String, List<GuestCheckout>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<GuestCheckout>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = GuestCheckout.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'email',
    'shipping_address',
    'items',
  };
}

