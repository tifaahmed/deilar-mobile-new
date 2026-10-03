import { Beneficiary } from '../types';

/**
 * Generates and downloads a high-resolution, print-ready digital PNG image 
 * of the official Deilar Medical Discount Card.
 */
export const downloadDeilarCardImage = async (
  beneficiary: Beneficiary,
  side: 'front' | 'back' = 'front'
): Promise<void> => {
  const canvas = document.createElement('canvas');
  // High resolution 2x scale for sharp printing/sharing (1200 x 750)
  canvas.width = 1200;
  canvas.height = 750;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const memId = beneficiary.cardNumber.startsWith('MEM')
    ? beneficiary.cardNumber
    : `MEM-${1000 + parseInt(beneficiary.id.replace(/\D/g, '') || '0')}`;

  // 1. Draw Card Background with Subtle Soft White & Gold Tone
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(20, 20, 1160, 710, 40);
  ctx.fill();

  // Subtle Border
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#cda44d';
  ctx.stroke();

  if (side === 'front') {
    // Top Gold & Navy Accent Bar
    const grad = ctx.createLinearGradient(0, 0, 1200, 0);
    grad.addColorStop(0, '#112443');
    grad.addColorStop(0.5, '#c89e43');
    grad.addColorStop(1, '#941946');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(20, 20, 1160, 20, [40, 40, 0, 0]);
    ctx.fill();

    // Top Right Ribbon
    ctx.fillStyle = '#941946';
    ctx.beginPath();
    ctx.roundRect(850, 60, 290, 60, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('بطاقة الخصم الطبي', 995, 100);

    // Left Logo DEILAR
    ctx.fillStyle = '#112443';
    ctx.font = '900 68px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('De', 80, 130);
    ctx.fillStyle = '#c89e43';
    ctx.fillText('ilar', 170, 130);

    // Arabic Deilar text
    ctx.fillStyle = '#112443';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('— ديلـــــر للرعاية الصحية —', 80, 185);

    ctx.fillStyle = '#c89e43';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('صحتك وأكتر • deilar.com', 80, 225);

    // Golden Smart Chip Graphic
    ctx.fillStyle = '#e5be64';
    ctx.beginPath();
    ctx.roundRect(80, 280, 110, 80, 12);
    ctx.fill();
    ctx.strokeStyle = '#996f1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chip Lines
    ctx.strokeStyle = '#7c5812';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(115, 280);
    ctx.lineTo(115, 360);
    ctx.moveTo(155, 280);
    ctx.lineTo(155, 360);
    ctx.moveTo(80, 320);
    ctx.lineTo(190, 320);
    ctx.stroke();

    // Contactless Wi-Fi Symbol
    ctx.strokeStyle = '#c89e43';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(240, 320, 25, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(240, 320, 38, -0.6, 0.6);
    ctx.stroke();

    // Card Holder Information Box
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(80, 420, 1040, 240, 24);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Card Details Text
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.font = '22px sans-serif';
    ctx.fillText('اسم حامل البطاقة', 1080, 465);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(beneficiary.name, 1080, 520);

    ctx.fillStyle = '#64748b';
    ctx.font = '20px sans-serif';
    ctx.fillText('صلة القرابة: ' + (beneficiary.relation || 'حامل الكرت الرئيسي'), 1080, 565);

    // Left side: Membership ID & Validity
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '22px sans-serif';
    ctx.fillText('رقم العضوية (MEM ID)', 120, 465);

    ctx.fillStyle = '#941946';
    ctx.font = 'bold 38px monospace';
    ctx.fillText(memId, 120, 520);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('● صالحة حتى: 31 / 12 / 2027 (مفعلة)', 120, 570);

    // Bottom Watermark
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('بطاقة إلكترونية رسمية معتمدة لكافة مستشفيات ومعامل وصيدليات شبكة ديلار في مصر', 600, 625);
  } else {
    // BACK SIDE
    // Magnetic Stripe
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 80, 1160, 110);

    // Signature Panel & QR / Barcode
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(80, 230, 700, 100, 10);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'italic bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('توقيع حامل الكرت المعتمد: ' + beneficiary.name, 100, 290);

    // Security Code
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('CVV: 892', 820, 290);

    // Terms of Service
    ctx.fillStyle = '#475569';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('شروط الاستخدام والخدمة الطبية:', 1080, 390);

    const rules = [
      '• يبرز هذا الكرت قبل إصدار الفاتورة أو طلب الخدمة لدى مقدم الرعاية الطبية.',
      '• الكرت شخصي ومخصص لحامله أو التابع المسجل لدى شبكة ديلار.',
      '• للحصول على الدعم الفوري أو حجز العمليات اتصل على: 01020709993',
      '• موقع شبكة ديلار الرسمية: www.deilar.com'
    ];

    rules.forEach((rule, idx) => {
      ctx.fillText(rule, 1080, 440 + idx * 45);
    });

    // Barcode Simulation
    ctx.fillStyle = '#0f172a';
    for (let x = 80; x < 550; x += 6) {
      const w = (x % 12 === 0 || x % 18 === 0) ? 4 : 2;
      ctx.fillRect(x, 620, w, 60);
    }
    ctx.font = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(memId, 80, 700);
  }

  // Convert canvas to image and trigger download
  const imageURL = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  downloadLink.href = imageURL;
  downloadLink.download = `deilar-card-${memId}-${side}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};
