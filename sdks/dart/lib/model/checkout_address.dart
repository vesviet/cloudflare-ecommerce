//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class CheckoutAddress {
  /// Returns a new [CheckoutAddress] instance.
  CheckoutAddress({
    this.fullname,
    this.address,
    this.zipcode,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? fullname;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? address;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? zipcode;

  @override
  bool operator ==(Object other) => identical(this, other) || other is CheckoutAddress &&
    other.fullname == fullname &&
    other.address == address &&
    other.zipcode == zipcode;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (fullname == null ? 0 : fullname!.hashCode) +
    (address == null ? 0 : address!.hashCode) +
    (zipcode == null ? 0 : zipcode!.hashCode);

  @override
  String toString() => 'CheckoutAddress[fullname=$fullname, address=$address, zipcode=$zipcode]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.fullname != null) {
      json[r'fullname'] = this.fullname;
    } else {
      json[r'fullname'] = null;
    }
    if (this.address != null) {
      json[r'address'] = this.address;
    } else {
      json[r'address'] = null;
    }
    if (this.zipcode != null) {
      json[r'zipcode'] = this.zipcode;
    } else {
      json[r'zipcode'] = null;
    }
    return json;
  }

  /// Returns a new [CheckoutAddress] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static CheckoutAddress? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        return true;
      }());

      return CheckoutAddress(
        fullname: mapValueOfType<String>(json, r'fullname'),
        address: mapValueOfType<String>(json, r'address'),
        zipcode: mapValueOfType<String>(json, r'zipcode'),
      );
    }
    return null;
  }

  static List<CheckoutAddress> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <CheckoutAddress>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = CheckoutAddress.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, CheckoutAddress> mapFromJson(dynamic json) {
    final map = <String, CheckoutAddress>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = CheckoutAddress.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of CheckoutAddress-objects as value to a dart map
  static Map<String, List<CheckoutAddress>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<CheckoutAddress>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = CheckoutAddress.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
  };
}

