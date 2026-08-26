//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class RMA {
  /// Returns a new [RMA] instance.
  RMA({
    required this.id,
    required this.orderId,
    required this.customerId,
    this.status = const RMAStatusEnum._('requested'),
    required this.reason,
    this.refundAmount,
    required this.createdAt,
    required this.updatedAt,
  });

  String id;

  String orderId;

  String customerId;

  RMAStatusEnum status;

  String reason;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  int? refundAmount;

  DateTime createdAt;

  DateTime updatedAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is RMA &&
    other.id == id &&
    other.orderId == orderId &&
    other.customerId == customerId &&
    other.status == status &&
    other.reason == reason &&
    other.refundAmount == refundAmount &&
    other.createdAt == createdAt &&
    other.updatedAt == updatedAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (orderId.hashCode) +
    (customerId.hashCode) +
    (status.hashCode) +
    (reason.hashCode) +
    (refundAmount == null ? 0 : refundAmount!.hashCode) +
    (createdAt.hashCode) +
    (updatedAt.hashCode);

  @override
  String toString() => 'RMA[id=$id, orderId=$orderId, customerId=$customerId, status=$status, reason=$reason, refundAmount=$refundAmount, createdAt=$createdAt, updatedAt=$updatedAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'order_id'] = this.orderId;
      json[r'customer_id'] = this.customerId;
      json[r'status'] = this.status;
      json[r'reason'] = this.reason;
    if (this.refundAmount != null) {
      json[r'refund_amount'] = this.refundAmount;
    } else {
      json[r'refund_amount'] = null;
    }
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
      json[r'updated_at'] = this.updatedAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [RMA] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static RMA? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "RMA[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "RMA[id]" has a null value in JSON.');
        assert(json.containsKey(r'order_id'), 'Required key "RMA[order_id]" is missing from JSON.');
        assert(json[r'order_id'] != null, 'Required key "RMA[order_id]" has a null value in JSON.');
        assert(json.containsKey(r'customer_id'), 'Required key "RMA[customer_id]" is missing from JSON.');
        assert(json[r'customer_id'] != null, 'Required key "RMA[customer_id]" has a null value in JSON.');
        assert(json.containsKey(r'reason'), 'Required key "RMA[reason]" is missing from JSON.');
        assert(json[r'reason'] != null, 'Required key "RMA[reason]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "RMA[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "RMA[created_at]" has a null value in JSON.');
        assert(json.containsKey(r'updated_at'), 'Required key "RMA[updated_at]" is missing from JSON.');
        assert(json[r'updated_at'] != null, 'Required key "RMA[updated_at]" has a null value in JSON.');
        return true;
      }());

      return RMA(
        id: mapValueOfType<String>(json, r'id')!,
        orderId: mapValueOfType<String>(json, r'order_id')!,
        customerId: mapValueOfType<String>(json, r'customer_id')!,
        status: RMAStatusEnum.fromJson(json[r'status']) ?? const RMAStatusEnum._('requested'),
        reason: mapValueOfType<String>(json, r'reason')!,
        refundAmount: mapValueOfType<int>(json, r'refund_amount'),
        createdAt: mapDateTime(json, r'created_at', r'')!,
        updatedAt: mapDateTime(json, r'updated_at', r'')!,
      );
    }
    return null;
  }

  static List<RMA> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <RMA>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = RMA.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, RMA> mapFromJson(dynamic json) {
    final map = <String, RMA>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = RMA.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of RMA-objects as value to a dart map
  static Map<String, List<RMA>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<RMA>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = RMA.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'order_id',
    'customer_id',
    'reason',
    'created_at',
    'updated_at',
  };
}


class RMAStatusEnum {
  /// Instantiate a new enum with the provided [value].
  const RMAStatusEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const requested = RMAStatusEnum._(r'requested');
  static const approved = RMAStatusEnum._(r'approved');
  static const refunded = RMAStatusEnum._(r'refunded');
  static const rejected = RMAStatusEnum._(r'rejected');

  /// List of all possible values in this [enum][RMAStatusEnum].
  static const values = <RMAStatusEnum>[
    requested,
    approved,
    refunded,
    rejected,
  ];

  static RMAStatusEnum? fromJson(dynamic value) => RMAStatusEnumTypeTransformer().decode(value);

  static List<RMAStatusEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <RMAStatusEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = RMAStatusEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [RMAStatusEnum] to String,
/// and [decode] dynamic data back to [RMAStatusEnum].
class RMAStatusEnumTypeTransformer {
  factory RMAStatusEnumTypeTransformer() => _instance ??= const RMAStatusEnumTypeTransformer._();

  const RMAStatusEnumTypeTransformer._();

  String encode(RMAStatusEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a RMAStatusEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  RMAStatusEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'requested': return RMAStatusEnum.requested;
        case r'approved': return RMAStatusEnum.approved;
        case r'refunded': return RMAStatusEnum.refunded;
        case r'rejected': return RMAStatusEnum.rejected;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [RMAStatusEnumTypeTransformer] instance.
  static RMAStatusEnumTypeTransformer? _instance;
}


