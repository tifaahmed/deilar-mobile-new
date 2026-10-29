# iOS / App Store checklist (things that cannot be done from code on Linux)

1. DONE: iOS platform added (ios/). On a Mac: `cd ios/App && pod install`, open in Xcode, set Team + bundle id com.deilar.card.
2. DONE: purpose strings are in ios/App/App/Info.plist.
   - `NSLocationWhenInUseUsageDescription`: "نستخدم موقعك لعرض أقرب المنشآت الطبية والمتاجر إليك."
   - `NSCameraUsageDescription`: "نستخدم الكاميرا لتصوير بطاقة الرقم القومي وصورة القريب عند إضافته لكارتك."
   - `NSPhotoLibraryUsageDescription`: "لاختيار صورة شخصية أو صورة بطاقة من معرض الصور."
   - `NSPhotoLibraryAddUsageDescription`: "لحفظ صورة كارت ديلار في معرض الصور."
3. App Store Connect: Privacy Policy URL = https://deilar.com/ar/privacy ; Support URL ; App Privacy labels (phone, name, national ID, address, photos, location, usage data, purchases).
4. App Review Notes: a demo phone number whose OTP is fixed (see admin OTP settings), and the sentence: "The card subscription gives discounts at physical partner facilities and stores (guideline 3.1.3(e)); no digital content is unlocked."
5. Backend env `MOBILE_IOS_STORE_URL` (App Store page, `https://apps.apple.com/app/id<number>`, exists after the app is created in App Store Connect) and `MOBILE_IOS_MIN_BUILD`.
6. Account deletion: Account → Delete account (already in the app).

## App Store Connect — ready-to-paste values (only the account owner can enter these)
- **Privacy Policy URL:** https://deilar.com/ar/privacy
- **Support URL:** https://deilar.com/ar/contact (or your site's contact page)
- **App Privacy labels** (all "linked to the user", none used for tracking):
  Contact Info → Name, Phone Number, Email; Identifiers → User ID; Sensitive/Other → National ID (as "Other User Content/Data");
  Location → Coarse/Precise Location (app functionality + analytics); User Content → Photos; Purchases → Purchase History;
  Usage Data → Product Interaction; Diagnostics → Crash/Other (error reports). Tracking: No.
- **App Review Notes:** "Sign-in is by phone + SMS code. Demo phone: <NUMBER>, code: <CODE>. The Deilar card subscription gives discounts at physical partner facilities and stores (guideline 3.1.3(e)); no digital content is unlocked. Account deletion: Account tab → Delete account."
- **Age rating:** 4+ (quiz is general knowledge).

## Apple IDs (set in ios/App/App.xcodeproj)
- Bundle ID `com.card.dealer` (differs from Android's `com.deilar.card`, on purpose), Team `V8VVU3W5MC`, App Apple ID `6825271113`, SKU `dealer001`.
- App Store page for `MOBILE_IOS_STORE_URL`: https://apps.apple.com/app/id6825271113
- Uploading needs the API key's `.p8` file (Key ID W8ZZ5PPG26, Issuer in App Store Connect → Keys); never commit it.
