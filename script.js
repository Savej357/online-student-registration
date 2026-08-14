// =============================================
// FIREBASE (Firestore only — file uploads use Cloudinary below)
// =============================================
// `db` is created in firebase-config.js, which is loaded before this file.
const REGISTRATIONS_COLLECTION = "registrations";

// =============================================
// CLOUDINARY (handles file uploads — no billing account required)
// =============================================
const CLOUDINARY_CLOUD_NAME = "du4ptyygj";
const CLOUDINARY_UPLOAD_PRESET = "ftclagos_uploads";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

// File upload rules (Cloudinary doesn't enforce these for you client-side)
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// =============================================
// HELPERS
// =============================================
function getCurrentDate() {
  const now = new Date();
  return now.toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'medium' });
}

// Simple, readable registration ID. Not guaranteed globally unique down to
// the last digit, but the timestamp + random suffix makes a collision
// practically impossible for a project of this scale.
function generateRegistrationId(prefix) {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
  return `FTC-${prefix}-${year}-${random}`;
}

function validateFile(file, label) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`${label}: only PDF, JPG or PNG files are allowed.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${label}: file must be smaller than 5MB.`);
  }
}

// Upload a single file to Cloudinary, returns a public download URL
// (or "Not uploaded" if the field was left empty, e.g. optional fields).
async function uploadFile(inputId, publicId, label) {
  const input = document.getElementById(inputId);
  if (!input || !input.files.length) return "Not uploaded";
  const file = input.files[0];

  validateFile(file, label);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "ftclagos_registrations");
  formData.append("public_id", `${publicId}_${Date.now()}`);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed for ${label}: ${res.statusText}`);
  const data = await res.json();
  return data.secure_url;
}

// Save the registration record to Firestore under a custom document ID
// (the registration ID itself), so the ID is guaranteed to match the record.
async function saveRegistration(registrationId, data) {
  await db.collection(REGISTRATIONS_COLLECTION).doc(registrationId).set({
    ...data,
    registrationId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// =============================================
// VALIDATION
// =============================================
function validateRequiredFields(fieldIds) {
  let valid = true;
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let isEmpty = false;
    if (el.tagName === "SELECT") isEmpty = !el.value || el.value.trim() === "";
    else if (el.type === "file") isEmpty = el.files.length === 0;
    else isEmpty = !el.value || el.value.trim() === "";
    if (isEmpty) {
      valid = false;
      el.style.borderColor = "#c73a2b";
      el.style.boxShadow = "0 0 0 3px rgba(199,58,43,0.15)";
      setTimeout(() => { el.style.borderColor = ""; el.style.boxShadow = ""; }, 3000);
    }
  });
  return valid;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// =============================================
// UI HELPERS
// =============================================
function showLoader(show) {
  const el = document.getElementById("loader");
  el.style.visibility = show ? "visible" : "hidden";
  el.style.opacity = show ? "1" : "0";
}
function showSuccessModal(registrationId) {
  document.getElementById("regIdDisplay").textContent = registrationId;
  const modal = document.getElementById("successModal");
  modal.style.visibility = "visible";
  modal.style.opacity = "1";
}
function closeModal() {
  const modal = document.getElementById("successModal");
  modal.style.visibility = "hidden";
  modal.style.opacity = "0";
}
document.getElementById("modalOkBtn").addEventListener("click", closeModal);
document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

// Prevent a form from being submitted again while one submission is
// already being processed (covers double-clicks and slow uploads).
function setFormSubmitting(formEl, submitting) {
  const btn = formEl.querySelector(".submit-btn");
  if (!btn) return;
  btn.disabled = submitting;
  btn.dataset.originalHtml = btn.dataset.originalHtml || btn.innerHTML;
  btn.innerHTML = submitting
    ? '<i class="fas fa-spinner fa-pulse"></i> Submitting...'
    : btn.dataset.originalHtml;
}

// =============================================
// TAB & FORM SWITCHING
// =============================================
let currentFormType = "hnd";
let currentNdSubType = "jambite";

const hndSection = document.getElementById("hndForm");
const ndSection = document.getElementById("ndForm");
const tabBtns = document.querySelectorAll(".tab-btn");
const civilRadios = document.querySelectorAll('input[name="civilServantHnd"]');
const studyLeaveDiv = document.getElementById("hndStudyLeaveContainer");
const subCards = document.querySelectorAll(".sub-card");
const ndJambiteDiv = document.getElementById("ndJambiteFields");
const ndCivilDiv = document.getElementById("ndCivilFields");

function updateHndStudyLeave() {
  const selected = document.querySelector('input[name="civilServantHnd"]:checked').value;
  studyLeaveDiv.style.display = selected === "Yes" ? "block" : "none";
}
civilRadios.forEach(r => r.addEventListener("change", updateHndStudyLeave));
updateHndStudyLeave();

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const formType = btn.getAttribute("data-form");
    currentFormType = formType;
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (formType === "hnd") {
      hndSection.classList.add("active-section");
      ndSection.classList.remove("active-section");
    } else {
      hndSection.classList.remove("active-section");
      ndSection.classList.add("active-section");
      switchNdSubType(currentNdSubType);
    }
  });
});

function switchNdSubType(type) {
  currentNdSubType = type;
  subCards.forEach(card => {
    card.classList.toggle("active-sub", card.getAttribute("data-ndtype") === type);
  });
  if (type === "jambite") {
    ndJambiteDiv.style.display = "block";
    ndCivilDiv.style.display = "none";
    setRequiredJambite(true);
    setRequiredCivil(false);
  } else {
    ndJambiteDiv.style.display = "none";
    ndCivilDiv.style.display = "block";
    setRequiredJambite(false);
    setRequiredCivil(true);
  }
}

function setRequiredJambite(required) {
  ["ndJambResult","ndAdmissionLetter","ndWaecResult","ndPassportJamb"].forEach(id => {
    const el = document.getElementById(id);
    if (el) required ? el.setAttribute("required","") : el.removeAttribute("required");
  });
}
function setRequiredCivil(required) {
  ["ndPartTimeForm","ndAttestation","ndPassportCivil"].forEach(id => {
    const el = document.getElementById(id);
    if (el) required ? el.setAttribute("required","") : el.removeAttribute("required");
  });
  const opt = document.getElementById("ndStudyLeaveOptional");
  if (opt) opt.removeAttribute("required");
}

subCards.forEach(card => {
  card.addEventListener("click", () => switchNdSubType(card.getAttribute("data-ndtype")));
});
switchNdSubType("jambite");

// =============================================
// HND SUBMIT
// =============================================
let hndSubmitting = false;
document.getElementById("hndRegistrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (hndSubmitting) return; // block duplicate/concurrent submissions

  const civilVal = document.querySelector('input[name="civilServantHnd"]:checked').value;
  const reqIds = ["hndFullname","hndEmail","hndPhone","hndNin","hndDob","hndNdResult","hndOlevel","hndItLetter","hndBirthCert","hndPassport","hndDept"];
  if (civilVal === "Yes") reqIds.push("hndStudyLeave");
  if (!validateRequiredFields(reqIds)) { alert("Please fill all required fields."); return; }
  if (!isValidEmail(document.getElementById("hndEmail").value)) {
    alert("Please enter a valid email address.");
    return;
  }

  const formEl = e.target;
  hndSubmitting = true;
  setFormSubmitting(formEl, true);
  showLoader(true);

  try {
    const studentName = document.getElementById("hndFullname").value.replace(/\s+/g, "_");
    const registrationId = generateRegistrationId("HND");
    const folder = `ftclagos_registrations/${registrationId}`;

    // Upload all files to Cloudinary simultaneously
    const [ndResultUrl, oLevelUrl, itLetterUrl, birthCertUrl, passportUrl, studyLeaveUrl] = await Promise.all([
      uploadFile("hndNdResult",  `${folder}/ND_Result_${studentName}`, "ND Statement of Result"),
      uploadFile("hndOlevel",    `${folder}/OLevel_${studentName}`, "O'Level Result"),
      uploadFile("hndItLetter",  `${folder}/IT_Letter_${studentName}`, "IT Letter/Certificate"),
      uploadFile("hndBirthCert", `${folder}/Birth_Cert_${studentName}`, "Birth Certificate"),
      uploadFile("hndPassport",  `${folder}/Passport_${studentName}`, "Passport Photograph"),
      civilVal === "Yes"
        ? uploadFile("hndStudyLeave", `${folder}/Study_Leave_${studentName}`, "Study Leave Letter")
        : Promise.resolve("N/A")
    ]);

    const registrationData = {
      registrationType: "HND",
      submissionDate: getCurrentDate(),
      fullName: document.getElementById("hndFullname").value,
      email: document.getElementById("hndEmail").value,
      phone: document.getElementById("hndPhone").value,
      nin: document.getElementById("hndNin").value,
      dob: document.getElementById("hndDob").value,
      department: document.getElementById("hndDept").value,
      civilServant: civilVal,
      documents: {
        ndResultFile: ndResultUrl,
        oLevelFile: oLevelUrl,
        itLetterFile: itLetterUrl,
        birthCertFile: birthCertUrl,
        passportFile: passportUrl,
        studyLeaveFile: studyLeaveUrl
      }
    };

    // Store in Firestore — this is the authoritative save.
    await saveRegistration(registrationId, registrationData);

    showLoader(false);
    showSuccessModal(registrationId);
    formEl.reset();
    updateHndStudyLeave();
  } catch (err) {
    showLoader(false);
    console.error("Registration error:", err);
    alert("Registration failed: " + err.message);
  } finally {
    hndSubmitting = false;
    setFormSubmitting(formEl, false);
  }
});

// =============================================
// ND SUBMIT
// =============================================
let ndSubmitting = false;
document.getElementById("ndRegistrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (ndSubmitting) return; // block duplicate/concurrent submissions

  const common = ["ndFullname","ndEmail","ndPhone","ndNin","ndDob","ndDept"];
  const extra = currentNdSubType === "jambite"
    ? ["ndJambResult","ndAdmissionLetter","ndWaecResult","ndPassportJamb"]
    : ["ndPartTimeForm","ndAttestation","ndPassportCivil"];
  if (!validateRequiredFields([...common, ...extra])) { alert("Please complete all required fields."); return; }
  if (!isValidEmail(document.getElementById("ndEmail").value)) {
    alert("Please enter a valid email address.");
    return;
  }

  const formEl = e.target;
  ndSubmitting = true;
  setFormSubmitting(formEl, true);
  showLoader(true);

  try {
    const studentName = document.getElementById("ndFullname").value.replace(/\s+/g, "_");
    const registrationId = generateRegistrationId("ND");
    const folder = `ftclagos_registrations/${registrationId}`;

    let documents = {
      ndResultFile: "N/A", oLevelFile: "N/A", itLetterFile: "N/A", birthCertFile: "N/A",
      passportFile: "N/A", studyLeaveFile: "N/A",
      jambResult: "N/A", admissionLetter: "N/A", waecResult: "N/A",
      partTimeForm: "N/A", attestation: "N/A", studyLeaveOptional: "N/A"
    };

    if (currentNdSubType === "jambite") {
      const [jambUrl, admissionUrl, waecUrl, passportUrl] = await Promise.all([
        uploadFile("ndJambResult",      `${folder}/JAMB_Result_${studentName}`, "JAMB Result Slip"),
        uploadFile("ndAdmissionLetter", `${folder}/Admission_Letter_${studentName}`, "Admission Letter"),
        uploadFile("ndWaecResult",      `${folder}/WAEC_Result_${studentName}`, "WAEC Result"),
        uploadFile("ndPassportJamb",    `${folder}/Passport_${studentName}`, "Passport Photograph")
      ]);
      documents.jambResult = jambUrl;
      documents.admissionLetter = admissionUrl;
      documents.waecResult = waecUrl;
      documents.passportFile = passportUrl;
    } else {
      const [partTimeUrl, attestationUrl, passportUrl, studyLeaveUrl] = await Promise.all([
        uploadFile("ndPartTimeForm",       `${folder}/Part_Time_Form_${studentName}`, "Part-Time Admission Form"),
        uploadFile("ndAttestation",        `${folder}/Attestation_${studentName}`, "Letter of Attestation"),
        uploadFile("ndPassportCivil",      `${folder}/Passport_${studentName}`, "Passport Photograph"),
        uploadFile("ndStudyLeaveOptional", `${folder}/Study_Leave_${studentName}`, "Study Leave Letter")
      ]);
      documents.partTimeForm = partTimeUrl;
      documents.attestation = attestationUrl;
      documents.passportFile = passportUrl;
      documents.studyLeaveOptional = studyLeaveUrl;
    }

    const registrationData = {
      registrationType: `ND - ${currentNdSubType === "jambite" ? "JAMBITE" : "CIVIL SERVANT"}`,
      submissionDate: getCurrentDate(),
      fullName: document.getElementById("ndFullname").value,
      email: document.getElementById("ndEmail").value,
      phone: document.getElementById("ndPhone").value,
      nin: document.getElementById("ndNin").value,
      dob: document.getElementById("ndDob").value,
      department: document.getElementById("ndDept").value,
      civilServant: "N/A",
      documents
    };

    // Store in Firestore — this is the authoritative save.
    await saveRegistration(registrationId, registrationData);

    showLoader(false);
    showSuccessModal(registrationId);
    formEl.reset();
  } catch (err) {
    showLoader(false);
    console.error("Registration error:", err);
    alert("Registration failed: " + err.message);
  } finally {
    ndSubmitting = false;
    setFormSubmitting(formEl, false);
  }
});