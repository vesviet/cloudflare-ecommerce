//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class GuestCheckoutShippingAddress {
  /// Returns a new [GuestCheckoutShippingAddress] instance.
  GuestCheckoutShippingAddress({
    required this.fullname,
    required this.address,
    required this.zipcode,
  });

  String fullname;

  String address;

  String zipcode;

  @override
  bool operator ==(Object other) => identical(this, other) || other is GuestCheckoutShippingAddress &&
    other.fullname == fullname &&
    other.address == address &&
    other.zipcode == zipcode;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (fullname.hashCode) +
    (address.hashCode) +
    (zipcode.hashCode);

  @override
  String toString() => 'GuestCheckoutShippingAddress[fullname=$fullname, address=$address, zipcode=$zipcode]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'fullname'] = this.fullname;
      json[r'address'] = this.address;
      json[r'zipcode'] = this.zipcode;
    return json;
  }

  /// Returns a new [GuestCheckoutShippingAddress] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static GuestCheckoutShippingAddress? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'fullname'), 'Required key "GuestCheckoutShippingAddress[fullname]" is missing from JSON.');
        assert(json[r'fullname'] != null, 'Required key "GuestCheckoutShippingAddress[fullname]" has a null value in JSON.');
        assert(json.containsKey(r'address'), 'Required key "GuestCheckoutShippingAddress[address]" is missing from JSON.');
        assert(json[r'address'] != null, 'Required key "GuestCheckoutShippingAddress[address]" has a null value in JSON.');
        assert(json.containsKey(r'zipcode'), 'Required key "GuestCheckoutShippingAddress[zipcode]" is missing from JSON.');
        assert(json[r'zipcode'] != null, 'Required key "GuestCheckoutShippingAddress[zipcode]" has a null value in JSON.');
        return true;
      }());

      return GuestCheckoutShippingAddress(
        fullname: mapValueOfType<String>(json, r'fullname')!,
        address: mapValueOfType<String>(json, r'address')!,
        zipcode: mapValueOfType<String>(json, r'zipcode')!,
      );
    }
    return null;
  }

  static List<GuestCheckoutShippingAddress> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <GuestCheckoutShippingAddress>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = GuestCheckoutShippingAddress.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, GuestCheckoutShippingAddress> mapFromJson(dynamic json) {
    final map = <String, GuestCheckoutShippingAddress>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = GuestCheckoutShippingAddress.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of GuestCheckoutShippingAddress-objects as value to a dart map
  static Map<String, List<GuestCheckoutShippingAddress>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<GuestCheckoutShippingAddress>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = GuestCheckoutShippingAddress.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'fullname',
    'address',
    'zipcode',
  };
}

