import React from "react";
import "./Home.css";

function RewardsModal({ onClose }) {
  const referralCode = "FARM" + Math.floor(Math.random() * 10000);

  const shareReferral = (platform) => {
    const message = `Join FarmAssist! Use my referral code: ${referralCode} and we both earn rewards!`;
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(message).then(() => {
        alert("Referral link copied!");
      });
    }
  };

  return (
    <div className="modal">
      <div className="modal-content rewards-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>🎁 Rewards & Coins</h2>
        <div className="rewards-info">
          <h3>💰 Earn Money by Referring Friends!</h3>
          <p>Share FarmAssist and earn rewards:</p>
          <ul>
            <li>🌟 ₹50 for each referral</li>
            <li>🏆 Bonus ₹100 for 5 referrals</li>
            <li>💎 Premium unlocks at 10 referrals</li>
          </ul>
          <div className="referral-code">
            <p><strong>Your Referral Code:</strong> <span className="code">{referralCode}</span></p>
          </div>
          <div className="share-buttons">
            <button onClick={() => shareReferral("whatsapp")} className="share-btn whatsapp">WhatsApp</button>
            <button onClick={() => shareReferral("copy")} className="share-btn copy">Copy Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RewardsModal;
