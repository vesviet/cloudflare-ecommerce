//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Review {
  /// Returns a new [Review] instance.
  Review({
    required this.id,
    required this.productId,
    this.customerId,
    required this.rating,
    this.comment,
    this.status = const ReviewStatusEnum._('pending'),
    this.verifiedPurchase = false,
    required this.createdAt,
  });

  String id;

  String productId;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? customerId;

  /// Minimum value: 1
  /// Maximum value: 5
  int rating;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? comment;

  ReviewStatusEnum status;

  bool verifiedPurchase;

  DateTime createdAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Review &&
    other.id == id &&
    other.productId == productId &&
    other.customerId == customerId &&
    other.rating == rating &&
    other.comment == comment &&
    other.status == status &&
    other.verifiedPurchase == verifiedPurchase &&
    other.createdAt == createdAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (productId.hashCode) +
    (customerId == null ? 0 : customerId!.hashCode) +
    (rating.hashCode) +
    (comment == null ? 0 : comment!.hashCode) +
    (status.hashCode) +
    (verifiedPurchase.hashCode) +
    (createdAt.hashCode);

  @override
  String toString() => 'Review[id=$id, productId=$productId, customerId=$customerId, rating=$rating, comment=$comment, status=$status, verifiedPurchase=$verifiedPurchase, createdAt=$createdAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'product_id'] = this.productId;
    if (this.customerId != null) {
      json[r'customer_id'] = this.customerId;
    } else {
      json[r'customer_id'] = null;
    }
      json[r'rating'] = this.rating;
    if (this.comment != null) {
      json[r'comment'] = this.comment;
    } else {
      json[r'comment'] = null;
    }
      json[r'status'] = this.status;
      json[r'verified_purchase'] = this.verifiedPurchase;
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [Review] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Review? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "Review[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "Review[id]" has a null value in JSON.');
        assert(json.containsKey(r'product_id'), 'Required key "Review[product_id]" is missing from JSON.');
        assert(json[r'product_id'] != null, 'Required key "Review[product_id]" has a null value in JSON.');
        assert(json.containsKey(r'rating'), 'Required key "Review[rating]" is missing from JSON.');
        assert(json[r'rating'] != null, 'Required key "Review[rating]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "Review[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "Review[created_at]" has a null value in JSON.');
        return true;
      }());

      return Review(
        id: mapValueOfType<String>(json, r'id')!,
        productId: mapValueOfType<String>(json, r'product_id')!,
        customerId: mapValueOfType<String>(json, r'customer_id'),
        rating: mapValueOfType<int>(json, r'rating')!,
        comment: mapValueOfType<String>(json, r'comment'),
        status: ReviewStatusEnum.fromJson(json[r'status']) ?? const ReviewStatusEnum._('pending'),
        verifiedPurchase: mapValueOfType<bool>(json, r'verified_purchase') ?? false,
        createdAt: mapDateTime(json, r'created_at', r'')!,
      );
    }
    return null;
  }

  static List<Review> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Review>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Review.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Review> mapFromJson(dynamic json) {
    final map = <String, Review>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Review.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Review-objects as value to a dart map
  static Map<String, List<Review>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Review>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Review.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'product_id',
    'rating',
    'created_at',
  };
}


class ReviewStatusEnum {
  /// Instantiate a new enum with the provided [value].
  const ReviewStatusEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const pending = ReviewStatusEnum._(r'pending');
  static const approved = ReviewStatusEnum._(r'approved');
  static const rejected = ReviewStatusEnum._(r'rejected');

  /// List of all possible values in this [enum][ReviewStatusEnum].
  static const values = <ReviewStatusEnum>[
    pending,
    approved,
    rejected,
  ];

  static ReviewStatusEnum? fromJson(dynamic value) => ReviewStatusEnumTypeTransformer().decode(value);

  static List<ReviewStatusEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <ReviewStatusEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = ReviewStatusEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [ReviewStatusEnum] to String,
/// and [decode] dynamic data back to [ReviewStatusEnum].
class ReviewStatusEnumTypeTransformer {
  factory ReviewStatusEnumTypeTransformer() => _instance ??= const ReviewStatusEnumTypeTransformer._();

  const ReviewStatusEnumTypeTransformer._();

  String encode(ReviewStatusEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a ReviewStatusEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  ReviewStatusEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'pending': return ReviewStatusEnum.pending;
        case r'approved': return ReviewStatusEnum.approved;
        case r'rejected': return ReviewStatusEnum.rejected;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [ReviewStatusEnumTypeTransformer] instance.
  static ReviewStatusEnumTypeTransformer? _instance;
}


