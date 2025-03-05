// nav.js
const createNavBar = () => {
    const navHTML = `
      <nav class="navbar">
        <ul>
          <li>
            <a href="#" id="sidebar-toggle">
                <span class="material-symbols-rounded">menu</span> 
              
            </a>
          </li>
          <li>
            <a href="HOME.html">
               <span class="material-symbols-rounded">home</span>
               Home
            </a>
          </li>
          <li>
            <a href="index.html">
               <span class="material-symbols-rounded">chat</span>
              Helper
            </a>
          </li>
          <li>
            <a href="Knowledge.html">
               <span class="material-symbols-rounded">school</span>
              Knowledge
            </a>
          </li>
          <li>
            <a href="Question.html">
               <span class="material-symbols-rounded">help</span>
              Question
            </a>
          </li>
          <li>
            <a href="Plant.html">
               <span class="material-symbols-rounded">local_florist</span>
              Plant
            </a>
          </li>
          <li>
            <a href="Chat.html">
               <span class="material-symbols-rounded">chat</span>
              Chatbot
            </a>
          </li>
        </ul>
      </nav>
    `;
  
    // Insert the navigation bar at the start of the body
    document.body.insertAdjacentHTML('afterbegin', navHTML);
  };
  
  // Execute when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', createNavBar);