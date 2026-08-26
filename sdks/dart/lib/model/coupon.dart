//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Coupon {
  /// Returns a new [Coupon] instance.
  Coupon({
    required this.id,
    required this.code,
    required this.type,
    required this.value,
    this.maxUses,
    this.uses = 0,
    this.expiresAt,
    this.isActive = true,
    required this.createdAt,
  });

  String id;

  String code;

  CouponTypeEnum type;

  num value;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  int? maxUses;

  int uses;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  int? expiresAt;

  bool isActive;

  DateTime createdAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Coupon &&
    other.id == id &&
    other.code == code &&
    other.type == type &&
    other.value == value &&
    other.maxUses == maxUses &&
    other.uses == uses &&
    other.expiresAt == expiresAt &&
    other.isActive == isActive &&
    other.createdAt == createdAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (code.hashCode) +
    (type.hashCode) +
    (value.hashCode) +
    (maxUses == null ? 0 : maxUses!.hashCode) +
    (uses.hashCode) +
    (expiresAt == null ? 0 : expiresAt!.hashCode) +
    (isActive.hashCode) +
    (createdAt.hashCode);

  @override
  String toString() => 'Coupon[id=$id, code=$code, type=$type, value=$value, maxUses=$maxUses, uses=$uses, expiresAt=$expiresAt, isActive=$isActive, createdAt=$createdAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'code'] = this.code;
      json[r'type'] = this.type;
      json[r'value'] = this.value;
    if (this.maxUses != null) {
      json[r'max_uses'] = this.maxUses;
    } else {
      json[r'max_uses'] = null;
    }
      json[r'uses'] = this.uses;
    if (this.expiresAt != null) {
      json[r'expires_at'] = this.expiresAt;
    } else {
      json[r'expires_at'] = null;
    }
      json[r'is_active'] = this.isActive;
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [Coupon] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Coupon? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "Coupon[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "Coupon[id]" has a null value in JSON.');
        assert(json.containsKey(r'code'), 'Required key "Coupon[code]" is missing from JSON.');
        assert(json[r'code'] != null, 'Required key "Coupon[code]" has a null value in JSON.');
        assert(json.containsKey(r'type'), 'Required key "Coupon[type]" is missing from JSON.');
        assert(json[r'type'] != null, 'Required key "Coupon[type]" has a null value in JSON.');
        assert(json.containsKey(r'value'), 'Required key "Coupon[value]" is missing from JSON.');
        assert(json[r'value'] != null, 'Required key "Coupon[value]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "Coupon[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "Coupon[created_at]" has a null value in JSON.');
        return true;
      }());

      return Coupon(
        id: mapValueOfType<String>(json, r'id')!,
        code: mapValueOfType<String>(json, r'code')!,
        type: CouponTypeEnum.fromJson(json[r'type'])!,
        value: num.parse('${json[r'value']}'),
        maxUses: mapValueOfType<int>(json, r'max_uses'),
        uses: mapValueOfType<int>(json, r'uses') ?? 0,
        expiresAt: mapValueOfType<int>(json, r'expires_at'),
        isActive: mapValueOfType<bool>(json, r'is_active') ?? true,
        createdAt: mapDateTime(json, r'created_at', r'')!,
      );
    }
    return null;
  }

  static List<Coupon> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Coupon>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Coupon.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Coupon> mapFromJson(dynamic json) {
    final map = <String, Coupon>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Coupon.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Coupon-objects as value to a dart map
  static Map<String, List<Coupon>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Coupon>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Coupon.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'code',
    'type',
    'value',
    'created_at',
  };
}


class CouponTypeEnum {
  /// Instantiate a new enum with the provided [value].
  const CouponTypeEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const percent = CouponTypeEnum._(r'percent');
  static const fixed = CouponTypeEnum._(r'fixed');
  static const freeship = CouponTypeEnum._(r'freeship');
  static const percentage = CouponTypeEnum._(r'percentage');
  static const freeShipping = CouponTypeEnum._(r'free_shipping');

  /// List of all possible values in this [enum][CouponTypeEnum].
  static const values = <CouponTypeEnum>[
    percent,
    fixed,
    freeship,
    percentage,
    freeShipping,
  ];

  static CouponTypeEnum? fromJson(dynamic value) => CouponTypeEnumTypeTransformer().decode(value);

  static List<CouponTypeEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <CouponTypeEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = CouponTypeEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [CouponTypeEnum] to String,
/// and [decode] dynamic data back to [CouponTypeEnum].
class CouponTypeEnumTypeTransformer {
  factory CouponTypeEnumTypeTransformer() => _instance ??= const CouponTypeEnumTypeTransformer._();

  const CouponTypeEnumTypeTransformer._();

  String encode(CouponTypeEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a CouponTypeEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  CouponTypeEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'percent': return CouponTypeEnum.percent;
        case r'fixed': return CouponTypeEnum.fixed;
        case r'freeship': return CouponTypeEnum.freeship;
        case r'percentage': return CouponTypeEnum.percentage;
        case r'free_shipping': return CouponTypeEnum.freeShipping;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [CouponTypeEnumTypeTransformer] instance.
  static CouponTypeEnumTypeTransformer? _instance;
}


