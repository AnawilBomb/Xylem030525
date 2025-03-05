// CSS ส่วนที่จำเป็น - ให้เพิ่มในส่วนบนของไฟล์ HTML ของคุณ
const sidebarStyles = `
<style>
  #sidebar-container {
    position: fixed;
    left: -250px;
    top: 0;
    width: 250px;
    height: 100%;
    background-color: var(--secondary-color);
    box-shadow: 2px 0 5px rgba(0,0,0,0.1);
    transition: 0.3s;
    z-index: 1000;
  }

  #sidebar-container.show-sidebar {
    left: 0;
  }

  .overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 999;
  }

  .overlay.show-overlay {
    display: block;
  }

  #open-sidebar-button {
    position: fixed;
    left: 20px;
    top: 20px;
    z-index: 998;
    background-color: var(--secondary-color);
    border: none;
    border-radius: 5px;
    padding: 10px;
    cursor: pointer;
    box-shadow: 0 2px 5px #ffffff);
  }

  #open-sidebar-button .material-symbols-rounded {
    color: #fff; /* เปลี่ยนสีไอคอนเป็นสีขาว */
  }

  .user-profile {
    padding: 20px;
    text-align: center;
    border-bottom: 1px solid #eee;
  }

  .profile-image {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin-bottom: 10px;
  }

  .username {
    display: block;
    font-size: 1.1em;
    font-weight: bold;
  }

  #sidebar-container a {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    text-decoration: none;
    color: #ffffff;
    transition: 0.2s;
  }

  #sidebar-container a:hover {
    background-color: var(--secondary-color);
  }

  #sidebar-container .material-symbols-rounded {
    margin-right: 10px;
    background-color: var(--secondary-color);
  }
</style>
`;

// สร้าง Sidebar
const createSidebar = async () => {
  try {
    // เพิ่ม CSS
    document.head.insertAdjacentHTML('beforeend', sidebarStyles);

    // เพิ่มปุ่มเปิด Sidebar
    const buttonHTML = `
      <button id="open-sidebar-button">
        <span class="material-symbols-rounded">menu</span>
      </button>
    `;
    document.body.insertAdjacentHTML('afterbegin', buttonHTML);

    // เช็คสถานะการล็อกอิน
    const response = await fetch('/users/check-auth', {
      credentials: 'include'
    });
    const authData = await response.json();
    
    const username = authData.authenticated ? authData.user.username : 'Guest';

    const sidebarHTML = `
      <div id="sidebar-container">
        <div class="user-profile">
          <img src="img/roze.jpg" alt="User Profile" class="profile-image">
          <span class="username">${username}</span>
        </div>
        <a href="HOME.html"><span class="material-symbols-rounded">home</span> Home</a>
        <a href="index.html"><span class="material-symbols-rounded">chat</span> Helper</a>
        <a href="Knowledge.html"><span class="material-symbols-rounded">school</span> Knowledge</a>
        <a href="Question.html"><span class="material-symbols-rounded">help</span> Question</a>
        <a href="Plant.html"><span class="material-symbols-rounded">local_florist</span> Plant</a>
        <a href="#" id="logout-btn"><span class="material-symbols-rounded">logout</span> Log Out</a>
      </div>
      <div class="overlay"></div>
    `;

    // สร้าง Sidebar และ Overlay
    let sidebarContainer = document.getElementById('sidebar-container');
    let overlay = document.querySelector('.overlay');

    if (sidebarContainer) {
      sidebarContainer.outerHTML = sidebarHTML;
    } else {
      document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }
  } catch (error) {
    console.error('Error creating sidebar:', error);
  }
};

// ฟังก์ชันสำหรับ Toggle Sidebar
function addSidebarToggle() {
  const openSidebarButton = document.getElementById('open-sidebar-button');
  const sidebarContainer = document.getElementById('sidebar-container');
  const overlay = document.querySelector('.overlay');

  function toggleSidebar() {
    if (sidebarContainer && overlay) {
      sidebarContainer.classList.toggle('show-sidebar');
      overlay.classList.toggle('show-overlay');
    }
  }

  if (openSidebarButton) {
    openSidebarButton.addEventListener('click', toggleSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', toggleSidebar);
  }
}

// ฟังก์ชันสำหรับ Logout
async function handleLogout() {
  try {
    const response = await fetch('/users/logout', {
      method: 'GET',
      credentials: 'include',
    });

    const result = await response.json();
    if (result.success) {
      alert('Logout successful!');
      window.location.href = '/login.html';
    } else {
      alert('Logout failed. Please try again.');
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('An error occurred during logout.');
  }
}

// ฟังก์ชันสำหรับตรวจสอบการล็อกอินและเปลี่ยนเส้นทาง
async function checkAuthAndRedirect() {
  try {
    const response = await fetch('/users/check-auth', {
      credentials: 'include'
    });
    const authData = await response.json();

    if (!authData.authenticated && !window.location.pathname.includes('login.html')) {
      window.location.href = '/login.html';
    }
    else if (authData.authenticated && window.location.pathname.includes('login.html')) {
      window.location.href = '/HOME.html';
    }
  } catch (error) {
    console.error('Auth check error:', error);
  }
}

// เรียกใช้งานฟังก์ชันเมื่อหน้าโหลดเสร็จ
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndRedirect();
  await createSidebar();
  addSidebarToggle();

  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
});