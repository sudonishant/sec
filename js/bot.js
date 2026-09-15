/*
  ================================================================
  TECHNICAL CLUB SEC SUPAUL - SECBOT INTERACTIVE ASSISTANT
  AI FAQ & Guidance Chatbot with Real SCE Supaul Data
  ================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  const botTrigger = document.getElementById('bot-trigger');
  const botWindow = document.getElementById('bot-window');
  const botClose = document.getElementById('bot-close');
  const botInput = document.getElementById('bot-input');
  const botSend = document.getElementById('bot-send');
  const botMessages = document.getElementById('bot-messages');

  if (!botTrigger || !botWindow) return;

  botTrigger.addEventListener('click', () => {
    botWindow.classList.toggle('active');
  });

  if (botClose) {
    botClose.addEventListener('click', () => {
      botWindow.classList.remove('active');
    });
  }

  const botKnowledge = [
    {
      keywords: ['join', 'membership', 'register', 'apply', 'member', 'pass'],
      response: 'To join Technical Club SEC Supaul, click on "Join Club & Get ID" in the top bar or fill the Student Membership Pass form! You will get an instant digital pass with a QR code.'
    },
    {
      keywords: ['college', 'sce', 'sec', 'supaul', 'about', 'beu', 'university', 'government'],
      response: 'Supaul College of Engineering (SCE Supaul) is a Govt. engineering college established in 2017, affiliated with Bihar Engineering University (BEU), Patna. Address: Beena Road, Ward No. 24, Supaul, Bihar - 852131. Web: www.scesupaul.org'
    },
    {
      keywords: ['hackathon', 'event', 'hack-sec', 'contest', 'competition'],
      response: 'HACK-SEC 2026 is our flagship 36-hour National Level Hackathon happening at SEC Supaul campus! Open for CSE, ECE, EE, Civil & Mech students with ₹50,000+ prize pool.'
    },
    {
      keywords: ['lab', 'robotics', 'hardware', 'location', 'where', 'address', 'room'],
      response: 'Technical Club & Robotics Lab is located at Room 208 (2nd Floor, Academic Building), Supaul College of Engineering, Beena Road, Ward No. 24, Supaul, Bihar.'
    },
    {
      keywords: ['faculty', 'principal', 'head', 'convenor', 'coordinator', 'contact'],
      response: 'College Contact: 06471-286010 | Email: supaulcollege@gmail.com / techclub@scesupaul.org. Principal & Faculty team lead our technical initiatives.'
    },
    {
      keywords: ['wings', 'domain', 'coding', 'ai', 'cyber', 'web', 'branch', 'courses'],
      response: 'We support B.Tech CSE, ECE, EE, Civil & Mechanical students across 6 active wings: 1. CP & DSA, 2. AI & Data Science, 3. Robotics & IoT, 4. Web & App Dev, 5. Cyber Security & CTF, 6. UI/UX & Design.'
    },
    {
      keywords: ['resource', 'notes', 'study', 'roadmap', 'download', 'pdf', 'manual'],
      response: 'Visit our "Downloads & Vault" section to search and download the Official Club Handbook (PDF), Brand Assets (ZIP), CP Top 150 Sheet, Web Dev Roadmap, and BEU Lab Manuals!'
    }
  ];

  function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `bot-msg ${isUser ? 'bot-msg-user' : 'bot-msg-bot'}`;
    msgDiv.textContent = text;
    botMessages.appendChild(msgDiv);
    botMessages.scrollTop = botMessages.scrollHeight;
  }

  function handleUserQuery(text) {
    if (!text.trim()) return;
    addMessage(text, true);

    const queryLower = text.toLowerCase();
    let foundResponse = false;

    for (let item of botKnowledge) {
      if (item.keywords.some(k => queryLower.includes(k))) {
        setTimeout(() => {
          addMessage(item.response, false);
        }, 400);
        foundResponse = true;
        break;
      }
    }

    if (!foundResponse) {
      setTimeout(() => {
        addMessage("I'm SecBot! I can help you with Club Membership, SCE Supaul info, BEU Patna affiliation, Hackathons, Lab location, and Downloads. Try asking 'Tell me about SCE Supaul' or 'How to download lab manuals'!", false);
      }, 400);
    }
  }

  if (botSend && botInput) {
    botSend.addEventListener('click', () => {
      const query = botInput.value;
      botInput.value = '';
      handleUserQuery(query);
    });

    botInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = botInput.value;
        botInput.value = '';
        handleUserQuery(query);
      }
    });
  }
});
