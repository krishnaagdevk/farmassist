import React from "react";
import "./Home.css";

function LearningHub({ onClose }) {
  const topics = [
    { id: "soil-management", title: "🌱 Soil Management", desc: "Learn about soil health, pH levels, and nutrient management" },
    { id: "crop-rotation", title: "🔄 Crop Rotation", desc: "Master the art of rotating crops for better yields" },
    { id: "pest-control", title: "🐛 Pest Control", desc: "Natural and effective pest management techniques" },
    { id: "irrigation", title: "💧 Irrigation Systems", desc: "Efficient water management and irrigation methods" },
    { id: "organic-farming", title: "🌿 Organic Farming", desc: "Sustainable and chemical-free farming practices" },
    { id: "harvest-storage", title: "📦 Harvest & Storage", desc: "Proper harvesting techniques and storage methods" },
  ];

  const openTopic = (topicId) => {
    alert(`Opening ${topicId.replace("-", " ")} module...`);
  };

  return (
    <div className="modal">
      <div className="modal-content learning-hub-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>🌱 Learning Hub</h2>
        <p>Expand your farming knowledge with these topics:</p>
        <div className="learning-topics">
          {topics.map((t) => (
            <div key={t.id} className="topic-card" onClick={() => openTopic(t.id)}>
              <h3>{t.title}</h3>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LearningHub;
