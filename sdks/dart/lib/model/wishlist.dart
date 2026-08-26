//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Wishlist {
  /// Returns a new [Wishlist] instance.
  Wishlist({
    required this.id,
    required this.customerId,
    required this.productId,
    required this.createdAt,
  });

  String id;

  String customerId;

  String productId;

  DateTime createdAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Wishlist &&
    other.id == id &&
    other.customerId == customerId &&
    other.productId == productId &&
    other.createdAt == createdAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (customerId.hashCode) +
    (productId.hashCode) +
    (createdAt.hashCode);

  @override
  String toString() => 'Wishlist[id=$id, customerId=$customerId, productId=$productId, createdAt=$createdAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'customer_id'] = this.customerId;
      json[r'product_id'] = this.productId;
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [Wishlist] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Wishlist? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "Wishlist[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "Wishlist[id]" has a null value in JSON.');
        assert(json.containsKey(r'customer_id'), 'Required key "Wishlist[customer_id]" is missing from JSON.');
        assert(json[r'customer_id'] != null, 'Required key "Wishlist[customer_id]" has a null value in JSON.');
        assert(json.containsKey(r'product_id'), 'Required key "Wishlist[product_id]" is missing from JSON.');
        assert(json[r'product_id'] != null, 'Required key "Wishlist[product_id]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "Wishlist[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "Wishlist[created_at]" has a null value in JSON.');
        return true;
      }());

      return Wishlist(
        id: mapValueOfType<String>(json, r'id')!,
        customerId: mapValueOfType<String>(json, r'customer_id')!,
        productId: mapValueOfType<String>(json, r'product_id')!,
        createdAt: mapDateTime(json, r'created_at', r'')!,
      );
    }
    return null;
  }

  static List<Wishlist> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Wishlist>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Wishlist.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Wishlist> mapFromJson(dynamic json) {
    final map = <String, Wishlist>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Wishlist.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Wishlist-objects as value to a dart map
  static Map<String, List<Wishlist>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Wishlist>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Wishlist.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'customer_id',
    'product_id',
    'created_at',
  };
}

