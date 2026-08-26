//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Fulfillment {
  /// Returns a new [Fulfillment] instance.
  Fulfillment({
    required this.id,
    required this.orderId,
    this.status = const FulfillmentStatusEnum._('processing'),
    this.trackingNumber,
    this.carrier,
    this.shippedAt,
    this.items = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  String id;

  String orderId;

  FulfillmentStatusEnum status;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? trackingNumber;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? carrier;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  DateTime? shippedAt;

  List<FulfillmentItemsInner> items;

  DateTime createdAt;

  DateTime updatedAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Fulfillment &&
    other.id == id &&
    other.orderId == orderId &&
    other.status == status &&
    other.trackingNumber == trackingNumber &&
    other.carrier == carrier &&
    other.shippedAt == shippedAt &&
    _deepEquality.equals(other.items, items) &&
    other.createdAt == createdAt &&
    other.updatedAt == updatedAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (orderId.hashCode) +
    (status.hashCode) +
    (trackingNumber == null ? 0 : trackingNumber!.hashCode) +
    (carrier == null ? 0 : carrier!.hashCode) +
    (shippedAt == null ? 0 : shippedAt!.hashCode) +
    (items.hashCode) +
    (createdAt.hashCode) +
    (updatedAt.hashCode);

  @override
  String toString() => 'Fulfillment[id=$id, orderId=$orderId, status=$status, trackingNumber=$trackingNumber, carrier=$carrier, shippedAt=$shippedAt, items=$items, createdAt=$createdAt, updatedAt=$updatedAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'order_id'] = this.orderId;
      json[r'status'] = this.status;
    if (this.trackingNumber != null) {
      json[r'tracking_number'] = this.trackingNumber;
    } else {
      json[r'tracking_number'] = null;
    }
    if (this.carrier != null) {
      json[r'carrier'] = this.carrier;
    } else {
      json[r'carrier'] = null;
    }
    if (this.shippedAt != null) {
      json[r'shipped_at'] = this.shippedAt!.toUtc().toIso8601String();
    } else {
      json[r'shipped_at'] = null;
    }
      json[r'items'] = this.items;
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
      json[r'updated_at'] = this.updatedAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [Fulfillment] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Fulfillment? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "Fulfillment[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "Fulfillment[id]" has a null value in JSON.');
        assert(json.containsKey(r'order_id'), 'Required key "Fulfillment[order_id]" is missing from JSON.');
        assert(json[r'order_id'] != null, 'Required key "Fulfillment[order_id]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "Fulfillment[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "Fulfillment[created_at]" has a null value in JSON.');
        assert(json.containsKey(r'updated_at'), 'Required key "Fulfillment[updated_at]" is missing from JSON.');
        assert(json[r'updated_at'] != null, 'Required key "Fulfillment[updated_at]" has a null value in JSON.');
        return true;
      }());

      return Fulfillment(
        id: mapValueOfType<String>(json, r'id')!,
        orderId: mapValueOfType<String>(json, r'order_id')!,
        status: FulfillmentStatusEnum.fromJson(json[r'status']) ?? const FulfillmentStatusEnum._('processing'),
        trackingNumber: mapValueOfType<String>(json, r'tracking_number'),
        carrier: mapValueOfType<String>(json, r'carrier'),
        shippedAt: mapDateTime(json, r'shipped_at', r''),
        items: FulfillmentItemsInner.listFromJson(json[r'items']),
        createdAt: mapDateTime(json, r'created_at', r'')!,
        updatedAt: mapDateTime(json, r'updated_at', r'')!,
      );
    }
    return null;
  }

  static List<Fulfillment> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Fulfillment>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Fulfillment.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Fulfillment> mapFromJson(dynamic json) {
    final map = <String, Fulfillment>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Fulfillment.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Fulfillment-objects as value to a dart map
  static Map<String, List<Fulfillment>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Fulfillment>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Fulfillment.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'order_id',
    'created_at',
    'updated_at',
  };
}


class FulfillmentStatusEnum {
  /// Instantiate a new enum with the provided [value].
  const FulfillmentStatusEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const processing = FulfillmentStatusEnum._(r'processing');
  static const shipped = FulfillmentStatusEnum._(r'shipped');
  static const delivered = FulfillmentStatusEnum._(r'delivered');
  static const cancelled = FulfillmentStatusEnum._(r'cancelled');

  /// List of all possible values in this [enum][FulfillmentStatusEnum].
  static const values = <FulfillmentStatusEnum>[
    processing,
    shipped,
    delivered,
    cancelled,
  ];

  static FulfillmentStatusEnum? fromJson(dynamic value) => FulfillmentStatusEnumTypeTransformer().decode(value);

  static List<FulfillmentStatusEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <FulfillmentStatusEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = FulfillmentStatusEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [FulfillmentStatusEnum] to String,
/// and [decode] dynamic data back to [FulfillmentStatusEnum].
class FulfillmentStatusEnumTypeTransformer {
  factory FulfillmentStatusEnumTypeTransformer() => _instance ??= const FulfillmentStatusEnumTypeTransformer._();

  const FulfillmentStatusEnumTypeTransformer._();

  String encode(FulfillmentStatusEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a FulfillmentStatusEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  FulfillmentStatusEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'processing': return FulfillmentStatusEnum.processing;
        case r'shipped': return FulfillmentStatusEnum.shipped;
        case r'delivered': return FulfillmentStatusEnum.delivered;
        case r'cancelled': return FulfillmentStatusEnum.cancelled;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [FulfillmentStatusEnumTypeTransformer] instance.
  static FulfillmentStatusEnumTypeTransformer? _instance;
}


