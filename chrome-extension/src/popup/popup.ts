// JobApply Agent - Popup Script
// Handles the popup UI and interactions

interface ApplicationStats {
  total: number;
  thisWeek: number;
  pending: number;
  interviews: number;
}

interface UserData {
  name: string;
  email: string;
}

class PopupManager {
  private content: HTMLElement;

  constructor() {
    this.content = document.getElementById('content')!;
    this.init();
  }

  async init() {
    try {
      // Check if user is authenticated
      const authResponse = await chrome.runtime.sendMessage({ action: 'get-auth-token' });
      
      if (!authResponse.token) {
        this.showNotAuthenticated();
        return;
      }

      // Check if on a job page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isJobPage = await this.detectJobPage(tab.url || '');

      // Get user data
      const userData = await this.getUserData();
      
      // Get stats
      const stats = await this.getStats();

      this.renderDashboard(userData, stats, isJobPage, tab);
    } catch (error) {
      console.error('Popup init error:', error);
      this.showError('Failed to initialize. Please try again.');
    }
  }

  async detectJobPage(url: string): Promise<{ isJobPage: boolean; platform: string | null }> {
    const response = await chrome.runtime.sendMessage({
      action: 'detect-job-page',
      url
    });
    
    return {
      isJobPage: response.isJobPage,
      platform: response.platform
    };
  }

  async getUserData(): Promise<UserData | null> {
    const response = await chrome.runtime.sendMessage({ action: 'get-user-data' });
    return response.success ? response.data : null;
  }

  async getStats(): Promise<ApplicationStats> {
    // In production, fetch from API
    return {
      total: 12,
      thisWeek: 3,
      pending: 5,
      interviews: 2
    };
  }

  renderDashboard(userData: UserData | null, stats: ApplicationStats, jobPage: { isJobPage: boolean; platform: string | null }, tab: chrome.tabs.Tab) {
    let html = '';

    // Welcome message
    if (userData) {
      html += `
        <div class="status-card">
          <h2>Welcome</h2>
          <p style="font-size: 16px; color: #1e293b; font-weight: 500;">${userData.name}</p>
        </div>
      `;
    }

    // Stats grid
    html += `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Applied</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.thisWeek}</div>
          <div class="stat-label">This Week</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.pending}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.interviews}</div>
          <div class="stat-label">Interviews</div>
        </div>
      </div>
    `;

    // Job page actions
    if (jobPage.isJobPage) {
      html += `
        <div class="job-detected">
          <h3>🎯 Job Page Detected</h3>
          <p>${jobPage.platform} application form found</p>
        </div>
        <button class="btn btn-primary" id="fill-form-btn">
          ✨ Auto-fill Application Form
        </button>
        <button class="btn btn-secondary" id="track-btn">
          📋 Track This Application
        </button>
      `;
    } else {
      html += `
        <div class="status-card" style="text-align: center;">
          <p style="color: #64748b; font-size: 14px;">
            Navigate to a job application page to use auto-fill features.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
            Supports: Greenhouse, Lever, Workday, LinkedIn, Indeed, Ashby
          </p>
        </div>
      `;
    }

    // Open dashboard link
    html += `
      <button class="btn btn-secondary" id="dashboard-btn">
        📊 Open Dashboard
      </button>
    `;

    this.content.innerHTML = html;

    // Attach event listeners
    document.getElementById('fill-form-btn')?.addEventListener('click', () => {
      this.fillForm(tab);
    });

    document.getElementById('track-btn')?.addEventListener('click', () => {
      this.trackApplication(tab);
    });

    document.getElementById('dashboard-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    });
  }

  showNotAuthenticated() {
    this.content.innerHTML = `
      <div class="not-authenticated">
        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
        <p>Please sign in to JobApply Agent to use the extension features.</p>
        <button class="btn btn-primary" id="signin-btn">
          Sign In
        </button>
      </div>
    `;

    document.getElementById('signin-btn')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/login' });
    });
  }

  showError(message: string) {
    this.content.innerHTML = `
      <div class="status-card" style="text-align: center; color: #ef4444;">
        <p>${message}</p>
      </div>
    `;
  }

  async fillForm(tab: chrome.tabs.Tab) {
    const btn = document.getElementById('fill-form-btn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Filling...';
    }

    try {
      await chrome.tabs.sendMessage(tab.id!, { action: 'fill-form' });
      
      if (btn) {
        btn.textContent = '✅ Form Filled!';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '✨ Auto-fill Application Form';
        }, 2000);
      }
    } catch (error) {
      if (btn) {
        btn.textContent = '❌ Failed';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '✨ Auto-fill Application Form';
        }, 2000);
      }
    }
  }

  async trackApplication(tab: chrome.tabs.Tab) {
    const btn = document.getElementById('track-btn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Tracking...';
    }

    try {
      // Get job info from content script
      const response = await chrome.tabs.sendMessage(tab.id!, { action: 'get-job-info' });
      
      if (response.success && response.jobInfo) {
        await chrome.runtime.sendMessage({
          action: 'track-application',
          data: {
            jobTitle: response.jobInfo.title,
            company: response.jobInfo.company,
            jobUrl: response.jobInfo.url,
            platform: response.jobInfo.platform || 'Unknown',
            status: 'APPLIED'
          }
        });

        if (btn) {
          btn.textContent = '✅ Tracked!';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '📋 Track This Application';
          }, 2000);
        }
      }
    } catch (error) {
      if (btn) {
        btn.textContent = '❌ Failed';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '📋 Track This Application';
        }, 2000);
      }
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
