// auth.js - ไฟล์สำหรับตรวจสอบการเข้าสู่ระบบในหน้า index.html

document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบสถานะการล็อกอินเมื่อโหลดหน้า
    checkAuthStatus();
    
    // ฟังก์ชันตรวจสอบสถานะการล็อกอิน
    async function checkAuthStatus() {
      try {
        const response = await fetch('/users/check-auth', {
          method: 'GET',
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.authenticated) {
          // ถ้ายังไม่ได้ล็อกอิน ให้ redirect ไปหน้า login
          window.location.href = '/login.html';
        } else {
          // ถ้าล็อกอินแล้ว ให้แสดงข้อมูลผู้ใช้
          displayUserInfo(data.user);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // หากมีข้อผิดพลาด redirect ไปหน้า login แบบปลอดภัย
        window.location.href = '/login.html';
      }
    }
  
    // ฟังก์ชันแสดงข้อมูลผู้ใช้
    function displayUserInfo(user) {
      if (user) {
        // แสดงชื่อผู้ใช้ในหน้า
        const headerElement = document.querySelector('.app-header');
        if (headerElement) {
          const welcomeElement = document.createElement('div');
          welcomeElement.className = 'user-welcome';
          welcomeElement.textContent = `ยินดีต้อนรับ, ${user.username}`;
          welcomeElement.style.fontSize = '14px';
          welcomeElement.style.marginTop = '5px';
          headerElement.appendChild(welcomeElement);
        }
  
        // เพิ่มปุ่มออกจากระบบ
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'ออกจากระบบ';
        logoutBtn.className = 'logout-btn';
        logoutBtn.style.position = 'absolute';
        logoutBtn.style.top = '10px';
        logoutBtn.style.right = '10px';
        logoutBtn.style.padding = '5px 10px';
        logoutBtn.style.backgroundColor = '#f44336';
        logoutBtn.style.color = 'white';
        logoutBtn.style.border = 'none';
        logoutBtn.style.borderRadius = '4px';
        logoutBtn.style.cursor = 'pointer';
        
        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch('/users/logout', {
              method: 'GET',
              credentials: 'include'
            });
            window.location.href = '/login.html';
          } catch (error) {
            console.error('Logout error:', error);
          }
        });
        
        document.body.appendChild(logoutBtn);
      }
    }
  });