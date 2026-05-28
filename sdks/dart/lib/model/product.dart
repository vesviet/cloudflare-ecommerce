//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Product {
  /// Returns a new [Product] instance.
  Product({
    required this.id,
    required this.slug,
    required this.title,
    this.description,
    this.status = const ProductStatusEnum._('draft'),
    required this.createdAt,
    required this.updatedAt,
  });

  String id;

  String slug;

  String title;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? description;

  ProductStatusEnum status;

  DateTime createdAt;

  DateTime updatedAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Product &&
    other.id == id &&
    other.slug == slug &&
    other.title == title &&
    other.description == description &&
    other.status == status &&
    other.createdAt == createdAt &&
    other.updatedAt == updatedAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (id.hashCode) +
    (slug.hashCode) +
    (title.hashCode) +
    (description == null ? 0 : description!.hashCode) +
    (status.hashCode) +
    (createdAt.hashCode) +
    (updatedAt.hashCode);

  @override
  String toString() => 'Product[id=$id, slug=$slug, title=$title, description=$description, status=$status, createdAt=$createdAt, updatedAt=$updatedAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'id'] = this.id;
      json[r'slug'] = this.slug;
      json[r'title'] = this.title;
    if (this.description != null) {
      json[r'description'] = this.description;
    } else {
      json[r'description'] = null;
    }
      json[r'status'] = this.status;
      json[r'created_at'] = this.createdAt.toUtc().toIso8601String();
      json[r'updated_at'] = this.updatedAt.toUtc().toIso8601String();
    return json;
  }

  /// Returns a new [Product] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Product? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'id'), 'Required key "Product[id]" is missing from JSON.');
        assert(json[r'id'] != null, 'Required key "Product[id]" has a null value in JSON.');
        assert(json.containsKey(r'slug'), 'Required key "Product[slug]" is missing from JSON.');
        assert(json[r'slug'] != null, 'Required key "Product[slug]" has a null value in JSON.');
        assert(json.containsKey(r'title'), 'Required key "Product[title]" is missing from JSON.');
        assert(json[r'title'] != null, 'Required key "Product[title]" has a null value in JSON.');
        assert(json.containsKey(r'created_at'), 'Required key "Product[created_at]" is missing from JSON.');
        assert(json[r'created_at'] != null, 'Required key "Product[created_at]" has a null value in JSON.');
        assert(json.containsKey(r'updated_at'), 'Required key "Product[updated_at]" is missing from JSON.');
        assert(json[r'updated_at'] != null, 'Required key "Product[updated_at]" has a null value in JSON.');
        return true;
      }());

      return Product(
        id: mapValueOfType<String>(json, r'id')!,
        slug: mapValueOfType<String>(json, r'slug')!,
        title: mapValueOfType<String>(json, r'title')!,
        description: mapValueOfType<String>(json, r'description'),
        status: ProductStatusEnum.fromJson(json[r'status']) ?? const ProductStatusEnum._('draft'),
        createdAt: mapDateTime(json, r'created_at', r'')!,
        updatedAt: mapDateTime(json, r'updated_at', r'')!,
      );
    }
    return null;
  }

  static List<Product> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Product>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Product.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Product> mapFromJson(dynamic json) {
    final map = <String, Product>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Product.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Product-objects as value to a dart map
  static Map<String, List<Product>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Product>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Product.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'id',
    'slug',
    'title',
    'created_at',
    'updated_at',
  };
}


class ProductStatusEnum {
  /// Instantiate a new enum with the provided [value].
  const ProductStatusEnum._(this.value);

  /// The underlying value of this enum member.
  final String value;

  @override
  String toString() => value;

  String toJson() => value;

  static const draft = ProductStatusEnum._(r'draft');
  static const published = ProductStatusEnum._(r'published');
  static const archived = ProductStatusEnum._(r'archived');

  /// List of all possible values in this [enum][ProductStatusEnum].
  static const values = <ProductStatusEnum>[
    draft,
    published,
    archived,
  ];

  static ProductStatusEnum? fromJson(dynamic value) => ProductStatusEnumTypeTransformer().decode(value);

  static List<ProductStatusEnum> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <ProductStatusEnum>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = ProductStatusEnum.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }
}

/// Transformation class that can [encode] an instance of [ProductStatusEnum] to String,
/// and [decode] dynamic data back to [ProductStatusEnum].
class ProductStatusEnumTypeTransformer {
  factory ProductStatusEnumTypeTransformer() => _instance ??= const ProductStatusEnumTypeTransformer._();

  const ProductStatusEnumTypeTransformer._();

  String encode(ProductStatusEnum data) => data.value;

  /// Decodes a [dynamic value][data] to a ProductStatusEnum.
  ///
  /// If [allowNull] is true and the [dynamic value][data] cannot be decoded successfully,
  /// then null is returned. However, if [allowNull] is false and the [dynamic value][data]
  /// cannot be decoded successfully, then an [UnimplementedError] is thrown.
  ///
  /// The [allowNull] is very handy when an API changes and a new enum value is added or removed,
  /// and users are still using an old app with the old code.
  ProductStatusEnum? decode(dynamic data, {bool allowNull = true}) {
    if (data != null) {
      switch (data) {
        case r'draft': return ProductStatusEnum.draft;
        case r'published': return ProductStatusEnum.published;
        case r'archived': return ProductStatusEnum.archived;
        default:
          if (!allowNull) {
            throw ArgumentError('Unknown enum value to decode: $data');
          }
      }
    }
    return null;
  }

  /// Singleton [ProductStatusEnumTypeTransformer] instance.
  static ProductStatusEnumTypeTransformer? _instance;
}


