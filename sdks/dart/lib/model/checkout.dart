//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class Checkout {
  /// Returns a new [Checkout] instance.
  Checkout({
    this.email,
    this.customerId,
    this.couponCode,
    this.locationId,
    this.address,
    this.shippingAddressJson = const {},
    this.billingAddressJson = const {},
    this.items = const [],
    this.affiliateId,
    this.utmSource,
    this.utmMedium,
    this.utmCampaign,
    this.acceptsMarketing,
    this.turnstileToken,
    this.redeemPoints,
    this.b2bCompany,
    this.b2bVatId,
  });

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? email;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? customerId;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? couponCode;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? locationId;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  CheckoutAddress? address;

  Map<String, Object> shippingAddressJson;

  Map<String, Object> billingAddressJson;

  List<CheckoutItemsInner> items;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? affiliateId;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? utmSource;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? utmMedium;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? utmCampaign;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  CheckoutAcceptsMarketing? acceptsMarketing;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? turnstileToken;

  /// Minimum value: 0
  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  int? redeemPoints;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? b2bCompany;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? b2bVatId;

  @override
  bool operator ==(Object other) => identical(this, other) || other is Checkout &&
    other.email == email &&
    other.customerId == customerId &&
    other.couponCode == couponCode &&
    other.locationId == locationId &&
    other.address == address &&
    _deepEquality.equals(other.shippingAddressJson, shippingAddressJson) &&
    _deepEquality.equals(other.billingAddressJson, billingAddressJson) &&
    _deepEquality.equals(other.items, items) &&
    other.affiliateId == affiliateId &&
    other.utmSource == utmSource &&
    other.utmMedium == utmMedium &&
    other.utmCampaign == utmCampaign &&
    other.acceptsMarketing == acceptsMarketing &&
    other.turnstileToken == turnstileToken &&
    other.redeemPoints == redeemPoints &&
    other.b2bCompany == b2bCompany &&
    other.b2bVatId == b2bVatId;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (email == null ? 0 : email!.hashCode) +
    (customerId == null ? 0 : customerId!.hashCode) +
    (couponCode == null ? 0 : couponCode!.hashCode) +
    (locationId == null ? 0 : locationId!.hashCode) +
    (address == null ? 0 : address!.hashCode) +
    (shippingAddressJson.hashCode) +
    (billingAddressJson.hashCode) +
    (items.hashCode) +
    (affiliateId == null ? 0 : affiliateId!.hashCode) +
    (utmSource == null ? 0 : utmSource!.hashCode) +
    (utmMedium == null ? 0 : utmMedium!.hashCode) +
    (utmCampaign == null ? 0 : utmCampaign!.hashCode) +
    (acceptsMarketing == null ? 0 : acceptsMarketing!.hashCode) +
    (turnstileToken == null ? 0 : turnstileToken!.hashCode) +
    (redeemPoints == null ? 0 : redeemPoints!.hashCode) +
    (b2bCompany == null ? 0 : b2bCompany!.hashCode) +
    (b2bVatId == null ? 0 : b2bVatId!.hashCode);

  @override
  String toString() => 'Checkout[email=$email, customerId=$customerId, couponCode=$couponCode, locationId=$locationId, address=$address, shippingAddressJson=$shippingAddressJson, billingAddressJson=$billingAddressJson, items=$items, affiliateId=$affiliateId, utmSource=$utmSource, utmMedium=$utmMedium, utmCampaign=$utmCampaign, acceptsMarketing=$acceptsMarketing, turnstileToken=$turnstileToken, redeemPoints=$redeemPoints, b2bCompany=$b2bCompany, b2bVatId=$b2bVatId]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
    if (this.email != null) {
      json[r'email'] = this.email;
    } else {
      json[r'email'] = null;
    }
    if (this.customerId != null) {
      json[r'customer_id'] = this.customerId;
    } else {
      json[r'customer_id'] = null;
    }
    if (this.couponCode != null) {
      json[r'coupon_code'] = this.couponCode;
    } else {
      json[r'coupon_code'] = null;
    }
    if (this.locationId != null) {
      json[r'location_id'] = this.locationId;
    } else {
      json[r'location_id'] = null;
    }
    if (this.address != null) {
      json[r'address'] = this.address;
    } else {
      json[r'address'] = null;
    }
      json[r'shipping_address_json'] = this.shippingAddressJson;
      json[r'billing_address_json'] = this.billingAddressJson;
      json[r'items'] = this.items;
    if (this.affiliateId != null) {
      json[r'affiliate_id'] = this.affiliateId;
    } else {
      json[r'affiliate_id'] = null;
    }
    if (this.utmSource != null) {
      json[r'utm_source'] = this.utmSource;
    } else {
      json[r'utm_source'] = null;
    }
    if (this.utmMedium != null) {
      json[r'utm_medium'] = this.utmMedium;
    } else {
      json[r'utm_medium'] = null;
    }
    if (this.utmCampaign != null) {
      json[r'utm_campaign'] = this.utmCampaign;
    } else {
      json[r'utm_campaign'] = null;
    }
    if (this.acceptsMarketing != null) {
      json[r'accepts_marketing'] = this.acceptsMarketing;
    } else {
      json[r'accepts_marketing'] = null;
    }
    if (this.turnstileToken != null) {
      json[r'turnstileToken'] = this.turnstileToken;
    } else {
      json[r'turnstileToken'] = null;
    }
    if (this.redeemPoints != null) {
      json[r'redeem_points'] = this.redeemPoints;
    } else {
      json[r'redeem_points'] = null;
    }
    if (this.b2bCompany != null) {
      json[r'b2b_company'] = this.b2bCompany;
    } else {
      json[r'b2b_company'] = null;
    }
    if (this.b2bVatId != null) {
      json[r'b2b_vat_id'] = this.b2bVatId;
    } else {
      json[r'b2b_vat_id'] = null;
    }
    return json;
  }

  /// Returns a new [Checkout] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static Checkout? fromJson(dynamic value) {
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      // Ensure that the map contains the required keys.
      // Note 1: the values aren't checked for validity beyond being non-null.
      // Note 2: this code is stripped in release mode!
      assert(() {
        assert(json.containsKey(r'items'), 'Required key "Checkout[items]" is missing from JSON.');
        assert(json[r'items'] != null, 'Required key "Checkout[items]" has a null value in JSON.');
        return true;
      }());

      return Checkout(
        email: mapValueOfType<String>(json, r'email'),
        customerId: mapValueOfType<String>(json, r'customer_id'),
        couponCode: mapValueOfType<String>(json, r'coupon_code'),
        locationId: mapValueOfType<String>(json, r'location_id'),
        address: CheckoutAddress.fromJson(json[r'address']),
        shippingAddressJson: mapCastOfType<String, Object>(json, r'shipping_address_json') ?? const {},
        billingAddressJson: mapCastOfType<String, Object>(json, r'billing_address_json') ?? const {},
        items: CheckoutItemsInner.listFromJson(json[r'items']),
        affiliateId: mapValueOfType<String>(json, r'affiliate_id'),
        utmSource: mapValueOfType<String>(json, r'utm_source'),
        utmMedium: mapValueOfType<String>(json, r'utm_medium'),
        utmCampaign: mapValueOfType<String>(json, r'utm_campaign'),
        acceptsMarketing: CheckoutAcceptsMarketing.fromJson(json[r'accepts_marketing']),
        turnstileToken: mapValueOfType<String>(json, r'turnstileToken'),
        redeemPoints: mapValueOfType<int>(json, r'redeem_points'),
        b2bCompany: mapValueOfType<String>(json, r'b2b_company'),
        b2bVatId: mapValueOfType<String>(json, r'b2b_vat_id'),
      );
    }
    return null;
  }

  static List<Checkout> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <Checkout>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = Checkout.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, Checkout> mapFromJson(dynamic json) {
    final map = <String, Checkout>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = Checkout.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of Checkout-objects as value to a dart map
  static Map<String, List<Checkout>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<Checkout>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = Checkout.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'items',
  };
}

