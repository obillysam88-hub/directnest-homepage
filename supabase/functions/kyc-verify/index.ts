import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      userId,
      idType,
      idNumber,
      idPhotoUrl,
      livenessVideoUrl,
      livenessFrameUrl,
      deviceId,
      faceHash,
    } = await req.json();

    if (!userId || !idType || !idNumber || !idPhotoUrl || !livenessFrameUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "Missing required fields.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create service-role client for DB writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- 1. OCR: Extract name, DOB from ID photo ----
    // In production, this calls AWS Textract or Google Vision.
    // For now, we simulate OCR extraction with a placeholder.
    const ocrResult = await simulateOCR(idPhotoUrl);
    const extractedName = ocrResult.name;
    const extractedDob = ocrResult.dob;

    // ---- 2. ID validation ----
    let idValid = false;
    if (idType === "NIN") {
      // NIN: match name from OCR against NIMC database
      // In production, call NIMC verification API
      idValid = extractedName !== null && idNumber.length === 11;
    } else if (idType === "BVN") {
      // TODO: Enable BVN at launch
      // BVN: validate via Paystack API — DISABLED for v1
      // In production: call Paystack's BVN resolve endpoint
      // GET https://api.paystack.co/bvn/resolve/{bvn}
      // with Authorization: Bearer SECRET_KEY
      // const paystackResult = await validateBVNPaystack(idNumber);
      // idValid = paystackResult.valid;
      idValid = false;
    }

    if (!idValid) {
      return new Response(
        JSON.stringify({
          success: false,
          reason:
            idType === "NIN"
              ? "NIN verification failed. Name on ID does not match."
              : "BVN validation failed. Please check your number.",
          face_similarity: 0,
          liveness_passed: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- 3. Face match: ID photo vs liveness frame ----
    // In production, call AWS Rekognition CompareFaces:
    //   const rekognition = new AWS.Rekognition();
    //   const result = await rekognition.compareFaces({
    //     SourceImage: { S3Object: { Bucket, Key: idPhotoKey } },
    //     TargetImage: { S3Object: { Bucket, Key: livenessFrameKey } },
    //     SimilarityThreshold: 90
    //   }).promise();
    const faceSimilarity = await simulateFaceMatch(
      idPhotoUrl,
      livenessFrameUrl
    );
    const faceMatchPassed = faceSimilarity >= 90;

    // ---- 4. Liveness check via AWS Rekognition ----
    // In production, use Rekognition DetectFaces with LivenessAssessment:
    //   const result = await rekognition.detectFaces({
    //     Image: { S3Object: { Bucket, Key: livenessFrameKey } },
    //     Attributes: ["DEFAULT"]
    //   }).promise();
    // For video: use Rekognition StartFaceLivenessSession
    const livenessPassed = await simulateLivenessCheck(livenessVideoUrl);

    // ---- 5. Final decision ----
    if (!faceMatchPassed) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "Face did not match. Try again.",
          face_similarity: faceSimilarity,
          liveness_passed: livenessPassed,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!livenessPassed) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "Liveness check failed. Ensure you are in a well-lit area.",
          face_similarity: faceSimilarity,
          liveness_passed: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- 6. Schedule raw video deletion (Day 30) ----
    // In production, create a cron job or scheduled function that:
    //   - Deletes liveness_video_url from storage after 30 days
    //   - Keeps only the face_hash permanently
    // For now, log the intent in the audit table
    await supabase.from("kyc_audit_log").insert({
      user_id: userId,
      action: "video_retention_scheduled",
      details: {
        video_url: livenessVideoUrl,
        delete_after_days: 30,
        face_hash: faceHash,
        device_id: deviceId,
      },
    });

    // ---- 7. Success ----
    return new Response(
      JSON.stringify({
        success: true,
        face_similarity: faceSimilarity,
        liveness_passed: true,
        extracted_name: extractedName,
        extracted_dob: extractedDob,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: "Verification service error: " + (err.message || "Unknown"),
        face_similarity: 0,
        liveness_passed: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/* ---------- Simulated OCR (replace with AWS Textract in production) ---------- */
async function simulateOCR(_imageUrl: string): Promise<{ name: string | null; dob: string | null }> {
  // In production:
  //   const textract = new AWS.Textract();
  //   const result = await textract.detectDocumentText({
  //     Document: { S3Object: { Bucket, Key } }
  //   }).promise();
  //   Parse result.Blocks for name and DOB fields
  await new Promise((r) => setTimeout(r, 500));
  return { name: "Verified User", dob: "1990-01-01" };
}

/* ---------- Simulated face match (replace with AWS Rekognition CompareFaces) ---------- */
async function simulateFaceMatch(
  _sourceUrl: string,
  _targetUrl: string
): Promise<number> {
  // In production:
  //   const rekognition = new AWS.Rekognition();
  //   const result = await rekognition.compareFaces({
  //     SourceImage: { S3Object: { Bucket, Key: sourceKey } },
  //     TargetImage: { S3Object: { Bucket, Key: targetKey } },
  //     SimilarityThreshold: 90
  //   }).promise();
  //   return result.FaceMatches?.[0]?.Similarity || 0;
  await new Promise((r) => setTimeout(r, 800));
  return 95.5;
}

/* ---------- Simulated liveness check (replace with AWS Rekognition Liveness) ---------- */
async function simulateLivenessCheck(_videoUrl: string): Promise<boolean> {
  // In production:
  //   const rekognition = new AWS.Rekognition();
  //   const session = await rekognition.startFaceLivenessSession({
  //     Video: { S3Object: { Bucket, Key: videoKey } }
  //   }).promise();
  //   return session.LivenessAssessment?.IsLive || false;
  await new Promise((r) => setTimeout(r, 600));
  return true;
}

// TODO: Enable BVN at launch
// ---------- BVN validation via Paystack — DISABLED for v1 ----------
// async function validateBVNPaystack(bvn: string): Promise<{ valid: boolean }> {
//   const response = await fetch(
//     `https://api.paystack.co/bvn/resolve/${bvn}`,
//     {
//       headers: {
//         Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
//         "Content-Type": "application/json"
//       }
//     }
//   );
//   const data = await response.json();
//   return { valid: data.status === true };
// }
