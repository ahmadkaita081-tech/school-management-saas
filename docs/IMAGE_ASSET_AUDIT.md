# Uploaded Image Asset Audit

## Summary

The uploaded assets are strong enough to support a premium SaaS launch experience when used intentionally. They should not be scattered randomly. Each image should reinforce a specific buyer belief: trust, operational clarity, parent confidence, teacher speed, finance control or data security.

## Approved Placement Map

| File | Optimized Asset | Best Placement | Reason |
| --- | --- | --- | --- |
| `Gemini_Generated_Image_czixccczixccczix.png` | `/marketing/platform-intelligence.webp` | Homepage hero/product intelligence | Best abstract overview image. Communicates premium command center and SaaS intelligence. |
| `Gemini_Generated_Image_5r6uju5r6uju5r6u.png` | `/marketing/school-operations.webp` | Homepage real operations section | Shows administrators in a professional school office. Strong for trust and buyer relevance. |
| `Gemini_Generated_Image_xdu4k2xdu4k2xdu4.png` | `/marketing/teacher-workflow.webp` | Teacher workflow / attendance narrative | Shows classroom use and teacher productivity. Strong for teacher adoption. |
| `Gemini_Generated_Image_s34r0ts34r0ts34r.png` | `/marketing/parent-portal.webp` | Parent portal narrative | Strong emotional trust image. Best for mobile parent experience. |
| `Gemini_Generated_Image_g266l4g266l4g266.png` | `/marketing/finance-intelligence.webp` | Finance/invoice section | Strong fit for invoice cards, revenue forecast and risk signals. |
| `Gemini_Generated_Image_eb1phveb1phveb1p.png` | `/marketing/security-cloud.webp` | Security/trust section | Strong fit for data protection and school record security. |
| `ChatGPT Image Jun 5, 2026, 11_38_53 PM.png` | `/brand/uploaded-logo-mark.webp`, favicon source | Brand/reference asset | Usable as uploaded logo mark. For actual UI, the vector/SVG logo remains sharper. |
| `ChatGPT Image Jun 5, 2026, 11_37_57 PM.png` | `/brand/uploaded-logo-wordmark.webp` | Brand/reference asset | Usable for pitch/social assets. Now used as the primary homepage uploaded wordmark treatment in a controlled dark brand container. Avoid using it at very small sizes because it is soft/blurred. |

## Favicon Decision

The favicon/app icons have been generated from the uploaded icon mark, but the app still includes the sharper SVG logo system for UI usage. This is the correct production compromise:

- Use uploaded logo mark for app icon/favicon continuity.
- Use vector logo component for crisp UI rendering.

## UX Guidance

### Do use images to

- Increase trust.
- Clarify who the product serves.
- Support feature sections.
- Make the product feel real and operational.

### Do not use images to

- Fill empty space without purpose.
- Replace actual product screenshots.
- Create misleading feature expectations.
- Slow down mobile page load.

## Performance Handling

Optimized WebP versions were created in:

```txt
public/marketing/
public/brand/
```

Responsive 960px WebP variants were created for future mobile optimization.

## Accessibility Alt Text

Every placed image should describe meaning, not decoration. Example:

```txt
School administrators using Horizons dashboards in a modern school office
```

## Remaining Asset Work

- Create real product screenshots after Vercel deployment.
- Add Open Graph image optimized for social sharing.
- Replace AI-generated UI overlays with real screenshots where possible.
- Compress and test Lighthouse performance after deployment.


## Homepage 3D Intelligence Box

A bespoke CSS 3D model was added to the homepage hero. It represents the product as a school operating system cube with six operational sides:

```txt
Command
Finance
Attendance
Trust
Parents
Results
```

This is intentionally not a generic screenshot block. It creates a memorable first impression while still communicating real product modules.
