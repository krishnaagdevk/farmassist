import React, { useEffect, useRef, useState } from "react";
import "./Dashboard.css";
import Chatbox from "./Chatbox";
import axios from "axios";
import api from "../../lib/api";
import {
  CalendarDays,
  CloudSun,
  TrendingUp,
  Users,
  GraduationCap,
  Award,
  PhoneCall,
  ArrowUpRight,
} from "lucide-react";
import farmerAiHero from "../../assets/images/farmer-ai-hero.jpg";

export default function Dashboard() {
  // ---------- UI / Modal State ----------
  const [isChatOpen, setChatOpen] = useState(false);
  const [isImageOpen, setImageOpen] = useState(false);
  const [isWeatherOpen, setWeatherOpen] = useState(false);
  const [isVoiceOpen, setVoiceOpen] = useState(false);
  const [isCropCalendarOpen, setCropCalendarOpen] = useState(false);
  const [isMarketOpen, setMarketOpen] = useState(false);
  const [isCommunityOpen, setCommunityOpen] = useState(false);
  const [isLearningOpen, setLearningOpen] = useState(false);
  const [isRewardsOpen, setRewardsOpen] = useState(false);

  // =====================================================
  // WEATHER
  // =====================================================
  const [locationInput, setLocationInput] = useState("");
  const [weatherDisplayData, setWeatherDisplayData] = useState(null);
  const [activeWeatherTab, setActiveWeatherTab] = useState("current");

  async function loadWeatherData(params = { location: "Ghaziabad" }) {
    try {
      const res = await api.get("/api/weather", {
        params,
      });
      setWeatherDisplayData(res.data.weather);
    } catch (err) {
      console.error("Weather error:", err);
    }
  }

  function openWeatherModal() {
    setWeatherOpen(true);
    loadWeatherData({ location: "Ghaziabad" });
  }
  function closeWeatherModal() {
    setWeatherOpen(false);
  }
  function searchLocation() {
    if (locationInput.trim()) {
      loadWeatherData({ location: locationInput.trim() });
    }
  }
  function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          loadWeatherData({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        () => alert("Unable to get your location. Please search manually.")
      );
    } else {
      alert("Geolocation not supported in this browser.");
    }
  }

  // =====================================================
  // IMAGE DIAGNOSE
  // =====================================================
  const fileInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [file, setFile] = useState(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState(null);
  const [diagnoseResult, setDiagnoseResult] = useState(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseError, setDiagnoseError] = useState(null);

  function openImageModal() {
    setImageOpen(true);
    resetImageUpload();
  }
  function closeImageModal() {
    setImageOpen(false);
  }

  async function uploadDiagnose() {
    if (!file) return;
    setDiagnoseLoading(true);
    setDiagnoseError(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await axios.post(
        "http://localhost:5000/api/image/diagnose",
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setDiagnoseResult(res.data.diagnosis);
    } catch (err) {
      console.error("Diagnose error:", err);
      setDiagnoseError("Diagnosis failed. Try again.");
    } finally {
      setDiagnoseLoading(false);
    }
  }

  // async function openCamera() {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  //     if (cameraVideoRef.current) {
  //       cameraVideoRef.current.srcObject = stream;
  //       setCameraStream(stream);
  //     }
  //   } catch (err) {
  //     console.error("Error accessing camera:", err);
  //     alert("Unable to access camera.");
  //   }
  // }
  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        setCameraStream(stream);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions or try file upload.");
    }
  }

  function captureImage() {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const capturedFile = new File([blob], "camera-capture.jpg", {
        type: "image/jpeg",
      });
      handleFile(capturedFile);
    });
    stopCamera();
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }

  function handleFile(selectedFile) {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreviewSrc(ev.target.result);
      setDiagnoseResult(null);
      setDiagnoseError(null);
    };
    reader.readAsDataURL(selectedFile);
  }

  function resetImageUpload() {
    setFile(null);
    setImagePreviewSrc(null);
    setDiagnoseResult(null);
    setDiagnoseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    stopCamera();
  }

  // =====================================================
  // CHAT
  // =====================================================
  function closeChatModal() {
    setChatOpen(false);
  }

  // =====================================================
  // VOICE (Simulated)
  // =====================================================
  // const [isRecording, setIsRecording] = useState(false);
  // const [voiceText, setVoiceText] = useState("");
  // const [voiceResponse, setVoiceResponse] = useState(null);

  // function openVoiceModal() {
  //   setVoiceOpen(true);
  // }
  // function closeVoiceModal() {
  //   setVoiceOpen(false);
  // }
  // function toggleRecording() {
  //   if (!isRecording) {
  //     setIsRecording(true);
  //     setVoiceText("Listening...");
  //     setTimeout(() => {
  //       const question = "I want to know best fertilizer for rice";
  //       setVoiceText(question);
  //       setVoiceResponse("Processing...");
  //       setTimeout(() => {
  //         const resp = generateFarmingResponse(question);
  //         setVoiceResponse(resp);
  //       }, 1400);
  //     }, 1400);
  //   } else {
  //     setIsRecording(false);
  //     setVoiceText("Tap to speak");
  //   }
  // }
  // function generateFarmingResponse(query) {
  //   if (query.toLowerCase().includes("fertilizer")) {
  //     return "✅ Recommended: Use 120:60:40 NPK per hectare for rice.";
  //   }
  //   return "ℹ️ Please consult an agronomist.";
  // }

  const [isRecording, setIsRecording] = useState(false);
const [voiceText, setVoiceText] = useState("");
const [voiceResponse, setVoiceResponse] = useState(null);

function openVoiceModal() {
  setVoiceOpen(true);
}
function closeVoiceModal() {
  setVoiceOpen(false);
}

// 🎤 Toggle Mic Recording
function toggleRecording() {
  if (!isRecording) {
    // Start Recording
    setIsRecording(true);
    setVoiceText("Listening...");

    // Web Speech API
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in your browser.");
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // tu Hindi/other lang bhi set kar sakta hai
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setVoiceResponse("Processing...");

      setTimeout(() => {
        const resp = generateFarmingResponse(transcript);
        setVoiceResponse(resp);
      }, 1200);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setVoiceText("Error recognizing speech.");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false); // mic stop ho gaya
    };
  } else {
    // Stop Recording (Manual toggle)
    setIsRecording(false);
    setVoiceText("Tap to speak");
  }
}

// 🌱 Farming AI Simulation
function generateFarmingResponse(query) {
  if (query.toLowerCase().includes("fertilizer")) {
    return "✅ Recommended: Use 120:60:40 NPK per hectare for rice.";
  }
  if (query.toLowerCase().includes("pest")) {
    return "⚠️ Pest Alert: Monitor crops for early signs of infestation.";
  }
  return "ℹ️ Please consult an agronomist.";
}


  // ---------- Crop Calendar ----------
  // We'll port essential cropData from your JS (rice + tomato etc.)
  const cropData = {
    rice: {
      name: "Rice (धान)",
      type: "Cereal",
      duration: "120-150 days",
      seasons: ["kharif", "rabi"],
      regions: ["all"],
      overview: {
        description: "Rice is the staple food crop of India, grown in diverse agro-climatic conditions.",
        varieties: ["Basmati", "Non-Basmati", "Aromatic", "Fine grain", "Medium grain", "Coarse grain"],
        soilType: "Clay loam, silty clay loam with pH 5.5-7.0",
        climate: "Tropical and subtropical with 20-35°C temperature",
        rainfall: "1000-2000mm annually",
      },
      cultivation: {
        landPrep: "Deep plowing, puddling, leveling for water retention",
        seedRate: "20-25 kg/hectare for transplanting, 60-80 kg/hectare for direct seeding",
        spacing: "20cm x 15cm for transplanting",
        fertilizer: "120:60:40 NPK kg/hectare",
        irrigation: "Continuous flooding during vegetative stage, intermittent during reproductive stage",
      },
      timeline: {
        kharif: [
          { stage: "Land Preparation", period: "May-June", icon: "🚜", details: "Deep plowing, puddling, leveling. Apply FYM 10-12 tons/hectare." },
          { stage: "Nursery Preparation", period: "June", icon: "🌱", details: "Prepare nursery beds, sow seeds. Maintain 2-3cm water level." },
          { stage: "Transplanting", period: "July", icon: "🌾", details: "Transplant 25-30 day old seedlings. Maintain proper spacing." },
          { stage: "Vegetative Growth", period: "July-August", icon: "🌿", details: "Apply nitrogen fertilizer. Maintain water level 2-5cm." },
          { stage: "Reproductive Phase", period: "September", icon: "🌸", details: "Panicle initiation. Apply potash fertilizer. Control pests." },
          { stage: "Grain Filling", period: "October", icon: "🌾", details: "Intermittent irrigation. Monitor for diseases." },
          { stage: "Maturity & Harvest", period: "November", icon: "🚛", details: "Harvest when 80% grains turn golden. Proper drying essential." },
        ],
        rabi: [
          { stage: "Land Preparation", period: "October-November", icon: "🚜", details: "Prepare fields after kharif harvest. Level properly." },
          { stage: "Sowing", period: "November-December", icon: "🌱", details: "Direct seeding or transplanting. Use short duration varieties." },
          { stage: "Vegetative Growth", period: "December-January", icon: "🌿", details: "Regular irrigation. Apply nitrogen in splits." },
          { stage: "Reproductive Phase", period: "February", icon: "🌸", details: "Flowering stage. Ensure adequate water supply." },
          { stage: "Grain Filling", period: "March", icon: "🌾", details: "Grain development. Reduce irrigation frequency." },
          { stage: "Harvest", period: "April", icon: "🚛", details: "Harvest before summer heat. Proper storage important." },
        ],
      },
      diseases: [
        { name: "Rust (Yellow, Brown, Black)", symptoms: "Rust colored pustules", control: "Resistant varieties, fungicide spray" },
        { name: "Powdery Mildew", symptoms: "White powdery growth", control: "Sulfur dusting, systemic fungicides" },
      ],
      pests: [{ name: "Aphids", symptoms: "Yellowing, stunted growth", control: "Insecticidal soap, predatory insects" }],
      market: { msp: "₹2,275/quintal (2024-25)", avgPrice: "₹2,400-2,800/quintal", demand: "High domestic demand", storage: "Moisture content below 12%, pest-free storage" },
    },
    tomato: {
      name: "Tomato (टमाटर)",
      type: "Vegetable",
      duration: "90-120 days",
      seasons: ["kharif", "rabi", "zaid"],
      regions: ["all"],
      overview: {
        description: "Tomato is one of the most important vegetable crops grown worldwide.",
        varieties: ["Determinate", "Indeterminate", "Cherry", "Hybrid"],
        soilType: "Well-drained sandy loam with pH 6.0-7.0",
        climate: "Warm season crop, temperature 20-25°C optimal",
        rainfall: "600-750mm annually",
      },
      cultivation: {
        landPrep: "Deep plowing, raised beds for drainage",
        seedRate: "300-400g/hectare",
        spacing: "60cm x 45cm",
        fertilizer: "120:80:50 NPK kg/hectare",
        irrigation: "Drip irrigation preferred, avoid water stress",
      },
      timeline: {
        rabi: [
          { stage: "Nursery Preparation", period: "September", icon: "🌱", details: "Prepare nursery beds, sow seeds in pro-trays." },
          { stage: "Land Preparation", period: "October", icon: "🚜", details: "Prepare raised beds, install drip irrigation." },
          { stage: "Transplanting", period: "October-November", icon: "🌿", details: "Transplant 4-5 week old seedlings." },
          { stage: "Vegetative Growth", period: "November-December", icon: "🌿", details: "Regular irrigation, apply nitrogen fertilizer." },
          { stage: "Flowering", period: "December-January", icon: "🌸", details: "Support plants with stakes. Apply phosphorus." },
          { stage: "Fruit Development", period: "January-February", icon: "🍅", details: "Regular harvesting begins. Apply potash." },
          { stage: "Peak Harvest", period: "February-March", icon: "🚛", details: "Daily harvesting. Proper post-harvest handling." },
        ],
      },
      diseases: [{ name: "Early Blight", symptoms: "Dark spots with concentric rings", control: "Fungicide spray, crop rotation" }],
      pests: [{ name: "Fruit Borer", symptoms: "Holes in fruits", control: "Pheromone traps, Bt spray" }],
      market: { msp: "Not applicable", avgPrice: "₹1,500-4,000/quintal (seasonal)", demand: "High demand year-round", storage: "Short shelf life" },
    },
  };

  // Crop calendar UI specific state
  const [selectedCropKey, setSelectedCropKey] = useState("rice");
  const [selectedSeason, setSelectedSeason] = useState("kharif");
  const [selectedRegion, setSelectedRegion] = useState("south");
  const [timelineHtml, setTimelineHtml] = useState("");
  const [cropOverviewHtml, setCropOverviewHtml] = useState("");
  const [cultivationHtml, setCultivationHtml] = useState("");
  const [diseasesHtml, setDiseasesHtml] = useState("");
  const [marketInfoHtml, setMarketInfoHtml] = useState("");
  const [seasonTipsHtml, setSeasonTipsHtml] = useState("");

  function openCropCalendarModal() {
    setCropCalendarOpen(true);
    // init with current selections
    updateCropCalendar(selectedCropKey, selectedSeason, selectedRegion);
  }
  function closeCropCalendarModal() {
    setCropCalendarOpen(false);
  }

  function updateCropCalendar(cropKey = selectedCropKey, season = selectedSeason) {
    const data = cropData[cropKey];
    if (!data) return;
    // timeline
    const timelineArr = data.timeline?.[season] || data.timeline?.kharif || [];
    setTimelineHtml(
      timelineArr
        .map(
          (stage) =>
            `<div class="timeline-item"><div class="timeline-icon">${stage.icon}</div><div class="timeline-content"><h5>${stage.stage}</h5><div class="timeline-period">${stage.period}</div><p>${stage.details}</p></div></div>`
        )
        .join("")
    );
    // overview
    setCropOverviewHtml(`
      <div class="overview-grid">
        <div class="overview-item"><h5>Description</h5><p>${data.overview.description}</p></div>
        <div class="overview-item"><h5>Duration</h5><p>${data.duration}</p></div>
        <div class="overview-item"><h5>Soil Type</h5><p>${data.overview.soilType}</p></div>
        <div class="overview-item"><h5>Climate</h5><p>${data.overview.climate}</p></div>
        <div class="overview-item"><h5>Rainfall</h5><p>${data.overview.rainfall}</p></div>
        <div class="overview-item"><h5>Varieties</h5><ul>${(data.overview.varieties || []).map((v) => `<li>${v}</li>`).join("")}</ul></div>
      </div>
    `);
    // cultivation
    setCultivationHtml(`
      <div class="cultivation-grid">
        <div class="cultivation-item"><h5>Land Preparation</h5><p>${data.cultivation?.landPrep || ""}</p></div>
        <div class="cultivation-item"><h5>Seed Rate</h5><p>${data.cultivation?.seedRate || ""}</p></div>
        <div class="cultivation-item"><h5>Spacing</h5><p>${data.cultivation?.spacing || ""}</p></div>
        <div class="cultivation-item"><h5>Fertilizer</h5><p>${data.cultivation?.fertilizer || ""}</p></div>
        <div class="cultivation-item"><h5>Irrigation</h5><p>${data.cultivation?.irrigation || ""}</p></div>
      </div>
    `);
    // diseases
    setDiseasesHtml(`
      <div class="diseases-section">
        ${(data.diseases || []).map(d => `<div class="disease-item"><h5>${d.name}</h5><p><strong>Symptoms:</strong> ${d.symptoms}</p><p><strong>Control:</strong> ${d.control}</p></div>`).join("")}
      </div>
    `);
    // market info
    setMarketInfoHtml(`
      <div class="market-grid">
        <div class="market-item"><h5>Current Price Range</h5><p>${data.market?.avgPrice || "N/A"}</p></div>
        <div class="market-item"><h5>MSP</h5><p>${data.market?.msp || "N/A"}</p></div>
        <div class="market-item"><h5>Demand</h5><p>${data.market?.demand || "N/A"}</p></div>
        <div class="market-item"><h5>Storage</h5><p>${data.market?.storage || "N/A"}</p></div>
      </div>
    `);
    // season tips
    setSeasonTipsHtml(`
      <div class="tips-grid">
        <div class="tip-card">Monitor soil moisture and avoid water stress.</div>
        <div class="tip-card">Use certified seeds for better germination.</div>
        <div class="tip-card">Apply fertilizer based on soil test recommendations.</div>
      </div>
    `);
  }

  // ---------- Market (placeholder) ----------
  const [marketLocation, setMarketLocation] = useState("palakkad");
  const [marketFilter, setMarketFilter] = useState("all");
  const [marketTimeFilter, setMarketTimeFilter] = useState("today");
  const [priceTableBodyHtml, setPriceTableBodyHtml] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const PAGE_SIZE = 8;
  const mockMarketData = [
    { crop: "Rice", price: "₹2,500", change: "+2%", min: "₹2,200", max: "₹2,700", volume: "1200 qt" },
    { crop: "Wheat", price: "₹2,800", change: "-1%", min: "₹2,600", max: "₹2,950", volume: "800 qt" },
    { crop: "Tomato", price: "₹3,200", change: "+5%", min: "₹2,900", max: "₹3,500", volume: "500 qt" },
    { crop: "Potato", price: "₹1,200", change: "+0.5%", min: "₹1,100", max: "₹1,300", volume: "300 qt" },
    { crop: "Onion", price: "₹2,100", change: "-0.8%", min: "₹2,000", max: "₹2,300", volume: "400 qt" },
    { crop: "Cotton", price: "₹45,000", change: "+1%", min: "₹43,000", max: "₹46,000", volume: "60 kg" },
    { crop: "Chili", price: "₹9,000", change: "+2%", min: "₹8,500", max: "₹9,200", volume: "70 kg" },
    { crop: "Maize", price: "₹2,100", change: "0%", min: "₹2,000", max: "₹2,300", volume: "600 qt" },
  ];

  function updateMarketTable() {
    const start = (pageNum - 1) * PAGE_SIZE;
    const page = mockMarketData.slice(start, start + PAGE_SIZE);
    setPriceTableBodyHtml(
      page
        .map(
          (r) =>
            `<tr>
              <td>${r.crop}</td>
              <td>${r.price}</td>
              <td>${r.change}</td>
              <td>${r.min}</td>
              <td>${r.max}</td>
              <td>${r.volume}</td>
              <td><button class="btn">View</button></td>
            </tr>`
        )
        .join("")
    );
  }

  useEffect(() => {
    updateMarketTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  function previousPage() {
    setPageNum((p) => Math.max(1, p - 1));
  }
  function nextPage() {
    const max = Math.ceil(mockMarketData.length / PAGE_SIZE);
    setPageNum((p) => Math.min(max, p + 1));
  }

  function refreshMarketData() {
    // simulate refresh
    alert("Market data refreshed (simulated).");
    updateMarketTable();
  }

  function searchMarketData() {
    // simple local filter (simulate)
    const q = document.getElementById("marketSearch")?.value?.toLowerCase() || "";
    const filtered =
      q.length > 0 ? mockMarketData.filter((m) => m.crop.toLowerCase().includes(q)) : mockMarketData;
    setPriceTableBodyHtml(
      filtered
        .slice(0, PAGE_SIZE)
        .map(
          (r) =>
            `<tr>
              <td>${r.crop}</td>
              <td>${r.price}</td>
              <td>${r.change}</td>
              <td>${r.min}</td>
              <td>${r.max}</td>
              <td>${r.volume}</td>
              <td><button class="btn" onclick="alert('View ${r.crop}')">View</button></td>
            </tr>`
        )
        .join("")
    );
  }

  // ---------- Community Forum ----------
  const [forumPosts, setForumPosts] = useState([
    { title: "Best fertilizer for wheat?", content: "Looking for suggestions!", category: "Advice", id: Date.now() - 10000 },
  ]);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("General");

  function openCommunityModal() {
    setCommunityOpen(true);
  }
  function closeCommunityModal() {
    setCommunityOpen(false);
  }

  function addForumPost() {
    if (!postTitle.trim() || !postContent.trim()) {
      alert("Please enter title and content.");
      return;
    }
    const item = { title: postTitle, content: postContent, category: postCategory, id: Date.now() };
    setForumPosts((prev) => [item, ...prev]);
    setPostTitle("");
    setPostContent("");
    setPostCategory("General");
  }

  // ---------- Learning Hub & Rewards (placeholders) ----------
  function openLearningHub() {
    setLearningOpen(true);
  }
  function openRewardsPopup() {
    setRewardsOpen(true);
  }

  // ---------- Misc helpers for injecting HTML into preserved sections ----------
  useEffect(() => {
    // timeline container
    const timelineContainer = document.getElementById("timelineContainer");
    if (timelineContainer) timelineContainer.innerHTML = timelineHtml;
    const cropOverview = document.getElementById("cropOverview");
    if (cropOverview) cropOverview.innerHTML = cropOverviewHtml;
    const cultivationInfo = document.getElementById("cultivationInfo");
    if (cultivationInfo) cultivationInfo.innerHTML = cultivationHtml;
    const diseasesInfo = document.getElementById("diseasesInfo");
    if (diseasesInfo) diseasesInfo.innerHTML = diseasesHtml;
    const marketInfo = document.getElementById("marketInfo");
    if (marketInfo) marketInfo.innerHTML = marketInfoHtml;
    const seasonTips = document.getElementById("seasonTips");
    if (seasonTips) seasonTips.innerHTML = seasonTipsHtml;

    // price table body
    const priceTableBody = document.getElementById("priceTableBody");
    if (priceTableBody) priceTableBody.innerHTML = priceTableBodyHtml;
    // page info
    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) {
      const max = Math.ceil(mockMarketData.length / PAGE_SIZE) || 1;
      pageInfo.textContent = `Page ${pageNum} of ${max}`;
    }
  }, [timelineHtml, cropOverviewHtml, cultivationHtml, diseasesHtml, marketInfoHtml, seasonTipsHtml, priceTableBodyHtml, pageNum]);

  // ---------- Initialization ----------
  useEffect(() => {
    // initial crop calendar data
    updateCropCalendar();
  }, []); // eslint-disable-line

  // =====================================================
  // MAIN UI RENDER
  // =====================================================
  return (
    <div>
      {/* Wavy / Hero */}
      <section className="wavy-section">
        <div className="wavy-bg">
          <div className="wavy-content">
            <div className="wavy-text">
              <h1>AI That Speaks Farmer</h1>
              <p>
                Ask any question about your crops, pests, weather, or farm care,
                and get instant advice from our smart AI assistant
              </p>
            </div>
            <div className="wavy-image-wrap">
              <img src={farmerAiHero} alt="AI Farming Assistant" className="wavy-hero-img" />
            </div>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section className="cards-section">
        <div className="card">
          <i className="fas fa-keyboard fa-3x card-icon"></i>
          <p>Type your question to get instant advice</p>
          <button onClick={() => setChatOpen(true)}>Type Query</button>
        </div>
        <div className="card">
          <i className="fas fa-microphone fa-3x card-icon"></i>
          <p>Speak your query to get instant advice</p>
          <button onClick={openVoiceModal}>Record Voice Query</button>
        </div>
        <div className="card">
          <i className="fas fa-image fa-3x card-icon"></i>
          <p>Upload an image to get instant analysis</p>
          <button onClick={openImageModal}>Upload Image</button>
        </div>
      </section>

      {/* Grid features */}
      <div className="dashboard-tiles-wrapper">
        <div className="dashboard-tiles-container">
          <div className="section-header-wrap">
            <h2 className="section-title">Farm Management & Services</h2>
            <p className="section-subtitle">Comprehensive tools for smart crop planning, real-time alerts, and farmer community</p>
          </div>
          <div className="dashboard-feature-grid">
            <div className="dashboard-feature-card" onClick={openCropCalendarModal}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <CalendarDays size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Crop Calendar</h3>
                <p>Track sowing, irrigation, and harvest schedules tailored to your region.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={() => { openWeatherModal(); }}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <CloudSun size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Weather Alerts</h3>
                <p>Stay updated with real-time temperature, rainfall, and spray conditions.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={() => setMarketOpen(true)}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <TrendingUp size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Market Updates</h3>
                <p>Check mandi prices, commodity rate trends, and nearby buyers.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={openCommunityModal}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <Users size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Community Forum</h3>
                <p>Connect, ask queries, and discuss with fellow farmers and agronomists.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={openLearningHub}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <GraduationCap size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Learning Hub</h3>
                <p>Watch expert guides, modern farming techniques, and quick video tutorials.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={openRewardsPopup}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <Award size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Rewards & Coins</h3>
                <p>Earn activity points, gain badges, and unlock marketplace discounts.</p>
              </div>
            </div>

            <div className="dashboard-feature-card" onClick={() => alert("Connecting you to your local Agriculture Extension Officer...")}>
              <div className="card-top">
                <div className="card-icon-bubble">
                  <PhoneCall size={24} />
                </div>
                <ArrowUpRight size={18} className="card-arrow" />
              </div>
              <div className="card-body">
                <h3>Officer Escalation</h3>
                <p>Directly contact government agricultural officers for certified guidance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

{/* Chat Modal (replaced with backend-connected Chatbox) */}
      {isChatOpen && <Chatbox onClose={closeChatModal} />}







      {/* Weather Modal */}
      {/* {isWeatherOpen && (
        <div className="modal-overlay">
          <div className="modal weather-modal">
            <div className="modal-header">
              <h2>🌦 Weather</h2>
              <button className="close-btn" onClick={closeWeatherModal}>
                ✖
              </button>
            </div>
            <div className="modal-content">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Enter location"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded-md"
                />
                <button
                  onClick={searchLocation}
                  className="px-3 py-1 bg-green-600 text-white rounded-md"
                >
                  Search
                </button>
                <button
                  onClick={getCurrentLocation}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md"
                >
                  📍 Current
                </button>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveWeatherTab("current")}
                  className={`px-3 py-1 rounded-md ${
                    activeWeatherTab === "current"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Current
                </button>
                <button
                  onClick={() => setActiveWeatherTab("forecast")}
                  className={`px-3 py-1 rounded-md ${
                    activeWeatherTab === "forecast"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Forecast
                </button>
              </div>

              {loadingWeather && <p>Loading...</p>}
              {weatherError && <p className="text-red-500">{weatherError}</p>}

              {weatherDisplayData && (
                <div>
                  {activeWeatherTab === "current" && (
                    <div>
                      <p>🌍 Location: {weatherDisplayData.location}</p>
                      <p>🌡 Temp: {weatherDisplayData.temperature}°C</p>
                      <p>💧 Humidity: {weatherDisplayData.humidity}%</p>
                      <p>🌤 {weatherDisplayData.description}</p>
                      <p className="text-xs text-gray-500">
                        Provider: {weatherDisplayData.provider}
                      </p>
                    </div>
                  )}
                  {activeWeatherTab === "forecast" &&
                    weatherDisplayData.forecast && (
                      <div className="grid grid-cols-2 gap-2">
                        {weatherDisplayData.forecast.map((f, idx) => (
                          <div
                            key={idx}
                            className="p-2 border rounded-md bg-gray-50 text-center"
                          >
                            <p>{f.day}</p>
                            <p>{f.icon}</p>
                            <p>
                              {f.high}° / {f.low}°
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      )} */}

 {/* Weather Modal */}
      {isWeatherOpen && (
        <div id="weatherModal" className="modal" style={{ display: "block" }}>
          <div className="modal-content weather-modal">
            <div className="weather-header">
              <h3>Advanced Weather Forecast & Alerts</h3>
              <span className="close" onClick={closeWeatherModal}>&times;</span>
            </div>

            <div className="weather-container">
              <div className="location-search">
                <input type="text" id="locationInput" placeholder="Search location..." value={locationInput} onChange={(e) => setLocationInput(e.target.value)} />
                <button onClick={searchLocation}>Search</button>
                <button onClick={getCurrentLocation}>Use Current Location</button>
              </div>

              <div className="weather-tabs">
                <button className={`tab-btn ${activeWeatherTab === "current" ? "active" : ""}`} onClick={() => setActiveWeatherTab("current")}>Current</button>
                <button className={`tab-btn ${activeWeatherTab === "hourly" ? "active" : ""}`} onClick={() => setActiveWeatherTab("hourly")}>Hourly</button>
                <button className={`tab-btn ${activeWeatherTab === "weekly" ? "active" : ""}`} onClick={() => setActiveWeatherTab("weekly")}>7-Day</button>
                <button className={`tab-btn ${activeWeatherTab === "farming" ? "active" : ""}`} onClick={() => setActiveWeatherTab("farming")}>Farm Advisory</button>
                <button className={`tab-btn ${activeWeatherTab === "alerts" ? "active" : ""}`} onClick={() => setActiveWeatherTab("alerts")}>Alerts</button>
              </div>

              <div id="currentTab" className={`weather-tab-content ${activeWeatherTab === "current" ? "active" : ""}`}>
                <div id="weatherDisplay" className="weather-display">
                  {weatherDisplayData ? (
                    <div className="current-weather">
                      <div className="weather-main">
                        <div className="weather-icon">{weatherDisplayData.current.icon}</div>
                        <div className="temperature">{weatherDisplayData.current.temp}°C</div>
                        <div className="weather-desc">{weatherDisplayData.current.condition}</div>
                        <div className="location-info">📍 {weatherDisplayData.location}</div>
                      </div>
                      <div className="weather-details">
                        <div className="detail-item"><span className="label">Feels like</span><span className="value">{weatherDisplayData.current.feelsLike}°C</span></div>
                        <div className="detail-item"><span className="label">Humidity</span><span className="value">{weatherDisplayData.current.humidity}%</span></div>
                        <div className="detail-item"><span className="label">Wind Speed</span><span className="value">{weatherDisplayData.current.wind}</span></div>
                        <div className="detail-item"><span className="label">UV Index</span><span className="value">{weatherDisplayData.current.uv}</span></div>
                        <div className="detail-item"><span className="label">Visibility</span><span className="value">{weatherDisplayData.current.visibility}</span></div>
                        <div className="detail-item"><span className="label">Pressure</span><span className="value">{weatherDisplayData.current.pressure}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div>Loading weather...</div>
                  )}
                </div>
              </div>

              <div id="hourlyTab" className={`weather-tab-content ${activeWeatherTab === "hourly" ? "active" : ""}`}>
                <div className="hourly-forecast">{/* Hourly data could be injected here */}</div>
              </div>

              <div id="weeklyTab" className={`weather-tab-content ${activeWeatherTab === "weekly" ? "active" : ""}`}>
                <div className="weekly-forecast">{/* Weekly data could be injected here */}</div>
              </div>

              <div id="farmingTab" className={`weather-tab-content ${activeWeatherTab === "farming" ? "active" : ""}`}>
                <div className="farming-advisory">
                  <div className="advisory-card"><h4>🌱 Crop Advisory</h4><p>Ideal conditions for rice transplanting. Soil moisture is optimal.</p></div>
                  <div className="advisory-card"><h4>💧 Irrigation Advice</h4><p>No irrigation needed for next 2 days. Expected rainfall: 15mm</p></div>
                  <div className="advisory-card"><h4>🚜 Field Work</h4><p>Good conditions for field operations. Wind speed favorable for spraying.</p></div>
                  <div className="advisory-card"><h4>🐛 Pest Alert</h4><p>High humidity may increase fungal disease risk. Monitor crops closely.</p></div>
                </div>
              </div>

              <div id="alertsTab" className={`weather-tab-content ${activeWeatherTab === "alerts" ? "active" : ""}`}>
                <div className="weather-alerts">
                  <div className="alert-item warning"><i className="fas fa-exclamation-triangle"></i><div><h4>Heavy Rain Warning</h4><p>Expected 50-75mm rainfall in next 24 hours</p><span className="alert-time">Valid until: Tomorrow 6 PM</span></div></div>
                  <div className="alert-item info"><i className="fas fa-info-circle"></i><div><h4>High Temperature Alert</h4><p>Temperature may reach 38°C on Thursday</p><span className="alert-time">Valid: Day after tomorrow</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Modal */}
      {isVoiceOpen && (
        <div id="voiceModal" className="modal" style={{ display: "block" }}>
          <div className="modal-content voice-modal">
            <div className="voice-header">
              <h3>Voice Query</h3>
              <span className="close" onClick={closeVoiceModal}>
                &times;
              </span>
            </div>
            <div className="voice-container">
              <div className="language-selector">
                <span>English</span>
              </div>
              <div className="voice-interface">
                <div className="mic-container">
                  <button
                    className="mic-button"
                    id="micButton"
                    onClick={toggleRecording}
                  >
                    <i className="fas fa-microphone" id="micIcon"></i>
                  </button>
                  <div className="recording-status" id="recordingStatus">
                    {isRecording ? "Listening..." : "Tap to speak"}
                  </div>
                </div>
                <div className="voice-text-display" id="voiceTextDisplay">
                  <p>{voiceText || "Your speech will appear here..."}</p>
                </div>
                {voiceResponse && (
                  <div className="voice-response" id="voiceResponse">
                    <h4>Response:</h4>
                    <div className="response-content" id="responseContent">
                      {voiceResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Calendar Modal */}
      {isCropCalendarOpen && (
        <div id="cropCalendarModal" className="modal" style={{ display: "block" }}>
          <div className="modal-content crop-calendar-modal">
            <div className="crop-calendar-header"><h3>Crop Calendar</h3><span className="close" onClick={closeCropCalendarModal}>&times;</span></div>
            <div className="crop-calendar-container">
              <div className="crop-selection">
                <div className="selection-group">
                  <label htmlFor="cropSelect">Select Crop:</label>
                  <select id="cropSelect" value={selectedCropKey} onChange={(e) => { setSelectedCropKey(e.target.value); updateCropCalendar(e.target.value, selectedSeason, selectedRegion); }}>
                    {Object.keys(cropData).map((k) => (<option key={k} value={k}>{cropData[k].name}</option>))}
                  </select>
                </div>

                <div className="selection-group">
                  <label htmlFor="seasonSelect">Select Season:</label>
                  <select id="seasonSelect" value={selectedSeason} onChange={(e) => { setSelectedSeason(e.target.value); updateCropCalendar(selectedCropKey, e.target.value, selectedRegion); }}>
                    <option value="kharif">Kharif (Monsoon - June to October)</option>
                    <option value="rabi">Rabi (Winter - November to April)</option>
                    <option value="zaid">Zaid (Summer - April to June)</option>
                    <option value="perennial">Perennial (Year Round)</option>
                  </select>
                </div>

                <div className="selection-group">
                  <label htmlFor="regionSelect">Select Region:</label>
                  <select id="regionSelect" value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); updateCropCalendar(selectedCropKey, selectedSeason, e.target.value); }}>
                    <option value="north">North India</option>
                    <option value="south">South India</option>
                    <option value="west">West India</option>
                    <option value="east">East India</option>
                    <option value="central">Central India</option>
                    <option value="northeast">Northeast India</option>
                  </select>
                </div>
              </div>

              <div className="crop-timeline">
                <h4 id="timelineTitle">Farming Timeline for {cropData[selectedCropKey]?.name || ""} - {selectedSeason}</h4>
                <div className="timeline-container" id="timelineContainer" dangerouslySetInnerHTML={{ __html: timelineHtml }} />
              </div>

              <div className="crop-details">
                <div className="details-tabs">
                  <button className="tab-btn active" onClick={() => {
                    const overviewTab = document.getElementById("overviewTab");
                    const cultivationTab = document.getElementById("cultivationTab");
                    const diseasesTab = document.getElementById("diseasesTab");
                    const marketTab = document.getElementById("marketTab");
                    if (overviewTab) overviewTab.style.display = "block";
                    if (cultivationTab) cultivationTab.style.display = "none";
                    if (diseasesTab) diseasesTab.style.display = "none";
                    if (marketTab) marketTab.style.display = "none";
                  }}>Overview</button>
                  <button className="tab-btn" onClick={() => {
                    const overviewTab = document.getElementById("overviewTab");
                    const cultivationTab = document.getElementById("cultivationTab");
                    const diseasesTab = document.getElementById("diseasesTab");
                    const marketTab = document.getElementById("marketTab");
                    if (overviewTab) overviewTab.style.display = "none";
                    if (cultivationTab) cultivationTab.style.display = "block";
                    if (diseasesTab) diseasesTab.style.display = "none";
                    if (marketTab) marketTab.style.display = "none";
                  }}>Cultivation</button>
                  <button className="tab-btn" onClick={() => {
                    const overviewTab = document.getElementById("overviewTab");
                    const cultivationTab = document.getElementById("cultivationTab");
                    const diseasesTab = document.getElementById("diseasesTab");
                    const marketTab = document.getElementById("marketTab");
                    if (overviewTab) overviewTab.style.display = "none";
                    if (cultivationTab) cultivationTab.style.display = "none";
                    if (diseasesTab) diseasesTab.style.display = "block";
                    if (marketTab) marketTab.style.display = "none";
                  }}>Diseases & Pests</button>
                  <button className="tab-btn" onClick={() => {
                    const overviewTab = document.getElementById("overviewTab");
                    const cultivationTab = document.getElementById("cultivationTab");
                    const diseasesTab = document.getElementById("diseasesTab");
                    const marketTab = document.getElementById("marketTab");
                    if (overviewTab) overviewTab.style.display = "none";
                    if (cultivationTab) cultivationTab.style.display = "none";
                    if (diseasesTab) diseasesTab.style.display = "none";
                    if (marketTab) marketTab.style.display = "block";
                  }}>Market Info</button>
                </div>

                <div id="overviewTab" className="tab-content active"><div id="cropOverview" dangerouslySetInnerHTML={{ __html: cropOverviewHtml }} /></div>
                <div id="cultivationTab" className="tab-content" style={{ display: "none" }}><div id="cultivationInfo" dangerouslySetInnerHTML={{ __html: cultivationHtml }} /></div>
                <div id="diseasesTab" className="tab-content" style={{ display: "none" }}><div id="diseasesInfo" dangerouslySetInnerHTML={{ __html: diseasesHtml }} /></div>
                <div id="marketTab" className="tab-content" style={{ display: "none" }}><div id="marketInfo" dangerouslySetInnerHTML={{ __html: marketInfoHtml }} /></div>
              </div>

              <div className="season-tips">
                <h4>Season-Specific Tips</h4>
                <div id="seasonTips" className="tips-content" dangerouslySetInnerHTML={{ __html: seasonTipsHtml }} />
              </div>
            </div>
          </div>
        </div>
    )}

 {/* Market Updates Modal */}
      {isMarketOpen && (
        <div id="marketModal" className="modal" style={{ display: "block" }}>
          <div className="modal-content market-modal">
            <div className="market-header"><h3>Market Updates & Price Analytics</h3><span className="close" onClick={() => setMarketOpen(false)}>&times;</span></div>
            <div className="market-container">
              <div className="market-controls">
                <div className="location-selector">
                  <label htmlFor="marketLocation">Market Location:</label>
                  <select id="marketLocation" value={marketLocation} onChange={(e) => setMarketLocation(e.target.value)}>
                    <option value="palakkad">Palakkad</option>
                    <option value="coimbatore">Coimbatore</option>
                    <option value="bangalore">Bangalore</option>
                    <option value="chennai">Chennai</option>
                    <option value="kochi">Kochi</option>
                    <option value="delhi">Delhi</option>
                    <option value="mumbai">Mumbai</option>
                    <option value="pune">Pune</option>
                    <option value="hyderabad">Hyderabad</option>
                    <option value="kolkata">Kolkata</option>
                  </select>
                </div>
                <div className="market-filters">
                  <select id="cropFilter" value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}>
                    <option value="all">All Crops</option>
                    <option value="cereals">Cereals</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="pulses">Pulses</option>
                    <option value="spices">Spices</option>
                  </select>
                  <select id="timeFilter" value={marketTimeFilter} onChange={(e) => setMarketTimeFilter(e.target.value)}>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                <button className="refresh-btn" onClick={refreshMarketData}><i className="fas fa-sync-alt"></i> Refresh</button>
              </div>

              <div className="market-search"><input type="text" id="marketSearch" placeholder="Search crops..." onKeyUp={searchMarketData} /><button onClick={() => { alert("Export (simulated)"); }}><i className="fas fa-download"></i> Export</button></div>

              <div className="market-stats">
                <div className="stat-card"><h4>Total Markets</h4><span id="totalMarkets">1,247</span></div>
                <div className="stat-card"><h4>Active Traders</h4><span id="activeTraders">8,934</span></div>
                <div className="stat-card"><h4>Daily Volume</h4><span id="dailyVolume">₹45.2 Cr</span></div>
                <div className="stat-card"><h4>Price Alerts</h4><span id="priceAlerts">23</span></div>
              </div>

              <div className="market-tabs">
                <button className="tab-btn active">Live Prices</button>
                <button className="tab-btn">Price Trends</button>
                <button className="tab-btn">Analytics</button>
                <button className="tab-btn">Price Alerts</button>
              </div>

              <div id="pricesTab" className="market-tab-content active">
                <div className="price-table-container">
                  <table id="priceTable" className="price-table">
                    <thead><tr><th>Crop</th><th>Current Price</th><th>Change</th><th>Min Price</th><th>Max Price</th><th>Volume</th><th>Action</th></tr></thead>
                    <tbody id="priceTableBody" dangerouslySetInnerHTML={{ __html: priceTableBodyHtml }} />
                  </table>
                </div>
                <div className="pagination">
                  <button onClick={previousPage} id="prevBtn">Previous</button>
                  <span id="pageInfo">Page {pageNum}</span>
                  <button onClick={nextPage} id="nextBtn">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

   {/* Community Forum Modal */}
      {isCommunityOpen && (
        <div id="communityModal" className="modal" style={{ display: "block" }}>
          <div className="modal-content community-modal">
            <div className="community-header"><h3>Community Forum</h3><span className="close" onClick={closeCommunityModal}>&times;</span></div>
            <div className="community-container">
              <div className="forum-posts">
                {forumPosts.map((p) => (
                  <div className="forum-post" key={p.id}><h4>{p.title}</h4><p>{p.content}</p><small>{p.category}</small></div>
                ))}
              </div>

              <div className="new-post">
                <input type="text" id="postTitle" placeholder="Title" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
                <textarea id="postContent" placeholder="Content" value={postContent} onChange={(e) => setPostContent(e.target.value)} />
                <select id="postCategory" value={postCategory} onChange={(e) => setPostCategory(e.target.value)}>
                  <option value="General">General</option>
                  <option value="Advice">Advice</option>
                  <option value="Market">Market</option>
                </select>
                <button onClick={addForumPost}>Post</button>
                <button onClick={closeCommunityModal}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Hub Modal */}
      {isLearningOpen && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content learning-hub-modal">
            <div className="learning-hub-header"><h3>Learning Hub</h3><span className="close" onClick={() => setLearningOpen(false)}>&times;</span></div>
            <div className="learning-hub-container"><p>[Videos & quizzes placeholder]</p></div>
          </div>
        </div>
      )}


      {/* Image Modal */}
      {isImageOpen && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content image-modal">
            <div className="image-header">
              <h2>Upload Image for Analysis</h2>
              <span className="close" onClick={closeImageModal}>
                &times;
              </span>
            </div>
            <div className="image-container">
              {!file && !cameraStream && (
                <div className="upload-options">
                  <div className="upload-option" onClick={openCamera}>
                    <i className="fas fa-camera fa-2x"></i>
                    <h4>Camera</h4>
                    <p>Take a photo with your camera</p>
                  </div>
                  <div
                    className="upload-option"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <i className="fas fa-upload fa-2x"></i>
                    <h4>Upload File</h4>
                    <p>Choose image from your device</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                </div>
              )}
              {cameraStream && (
                <div className="camera-section">
                  <video ref={cameraVideoRef} autoPlay id="cameraVideo"></video>
                  <div className="camera-controls">
                    <button className="capture-btn" onClick={captureImage}>
                      Capture
                    </button>
                    <button className="cancel-btn" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                  <canvas
                    ref={cameraCanvasRef}
                    style={{ display: "none" }}
                  ></canvas>
                </div>
              )}
              {file && (
                <div className="image-preview-section">
                  <div className="image-preview">
                    <img src={imagePreviewSrc} alt="Preview" />
                    <div className="ocr-actions">
                      <button
                        className="process-btn"
                        onClick={uploadDiagnose}
                        disabled={diagnoseLoading}
                      >
                        {diagnoseLoading ? "Analyzing..." : "Analyze"}
                      </button>
                      <button className="reset-btn" onClick={resetImageUpload}>
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="ocr-results">
                    <h4>Result</h4>
                    {diagnoseError && (
                      <p style={{ color: "red" }}>{diagnoseError}</p>
                    )}
                    {diagnoseResult && (
                      <div className="image-response">
                        {diagnoseResult.disease === "Uncertain" ? (
                          <>
                            <h3>⚠️ Diagnosis Uncertain</h3>
                            <p>
                              The image may not be a plant, or the system wasn’t
                              sure.
                            </p>
                            {diagnoseResult.rawAdvice && (
                              <p>{diagnoseResult.rawAdvice}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <h3>✅ Disease: {diagnoseResult.disease}</h3>
                            <p>
                              <strong>Problems:</strong>{" "}
                              {diagnoseResult.problems?.join(", ") || "N/A"}
                            </p>
                            <p>
                              <strong>Solutions:</strong>{" "}
                              {diagnoseResult.solutions?.join(", ") || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Provider: {diagnoseResult.provider}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
{/* Rewards Modal */}
      {isRewardsOpen && (
        <div className="modal" style={{ display: "block" }}>
          <div className="modal-content rewards-popup">
            <div className="rewards-popup-header"><h3>Rewards</h3><span className="close" onClick={() => setRewardsOpen(false)}>&times;</span></div>
            <div className="rewards-popup-container"><p>[Rewards & coins placeholder]</p></div>
          </div>
        </div>
      )}

    </div>
  );
}
