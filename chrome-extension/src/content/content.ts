// JobApply Agent - Content Script
// Auto-fills job application forms on various platforms

interface UserData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
  resumeUrl: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
  }[];
}

interface JobInfo {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
}

// Main content script class
class JobApplyContentScript {
  private userData: UserData | null = null;
  private detectedPlatform: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request).then(sendResponse).catch(error => {
        console.error('Content script error:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    });

    // Detect job page on load
    await this.detectJobPage();
  }

  async handleMessage(request: any) {
    switch (request.action) {
      case 'fill-form':
        return await this.fillForm();
      
      case 'job-page-detected':
        this.detectedPlatform = request.platform;
        this.showJobPageUI();
        return { success: true };
      
      case 'get-job-info':
        return { success: true, jobInfo: this.extractJobInfo() };
      
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  async detectJobPage() {
    const url = window.location.href;
    
    const platforms = [
      { pattern: /greenhouse\.io/i, name: 'Greenhouse' },
      { pattern: /lever\.co/i, name: 'Lever' },
      { pattern: /workday\.com/i, name: 'Workday' },
      { pattern: /indeed\.com\/viewjob/i, name: 'Indeed' },
      { pattern: /linkedin\.com\/jobs/i, name: 'LinkedIn' },
      { pattern: /jobs\.ashbyhq\.com/i, name: 'Ashby' }
    ];
    
    const detected = platforms.find(p => p.pattern.test(url));
    
    if (detected) {
      this.detectedPlatform = detected.name;
      this.showJobPageUI();
    }
  }

  showJobPageUI() {
    // Remove existing UI if any
    const existing = document.getElementById('jobapply-floating-ui');
    if (existing) existing.remove();

    // Create floating UI
    const ui = document.createElement('div');
    ui.id = 'jobapply-floating-ui';
    ui.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 16px;
        width: 280px;
        font-family: system-ui, -apple-system, sans-serif;
        border: 2px solid #4F46E5;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #4F46E5, #7C3AED);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            color: white;
            font-weight: bold;
          ">JA</div>
          <div>
            <div style="font-weight: 600; font-size: 14px;">JobApply Agent</div>
            <div style="font-size: 12px; color: #666;">${this.detectedPlatform} detected</div>
          </div>
        </div>
        <button id="jobapply-fill-btn" style="
          width: 100%;
          padding: 10px;
          background: linear-gradient(135deg, #4F46E5, #7C3AED);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          margin-bottom: 8px;
        ">
          ✨ Auto-fill Application
        </button>
        <button id="jobapply-track-btn" style="
          width: 100%;
          padding: 8px;
          background: #F3F4F6;
          color: #374151;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          font-size: 12px;
        ">
          📋 Track This Application
        </button>
      </div>
    `;
    
    document.body.appendChild(ui);

    // Add event listeners
    ui.querySelector('#jobapply-fill-btn')?.addEventListener('click', () => {
      this.fillForm();
    });

    ui.querySelector('#jobapply-track-btn')?.addEventListener('click', () => {
      this.trackApplication();
    });
  }

  async fillForm() {
    try {
      // Get user data from background script
      const response = await chrome.runtime.sendMessage({ action: 'get-user-data' });
      
      if (!response.success) {
        this.showNotification('Error', 'Please sign in to JobApply Agent first');
        return { success: false, error: 'Not authenticated' };
      }
      
      this.userData = response.data;
      
      // Fill form based on detected platform
      switch (this.detectedPlatform) {
        case 'Greenhouse':
          await this.fillGreenhouseForm();
          break;
        case 'Lever':
          await this.fillLeverForm();
          break;
        case 'Workday':
          await this.fillWorkdayForm();
          break;
        case 'LinkedIn':
          await this.fillLinkedInForm();
          break;
        case 'Indeed':
          await this.fillIndeedForm();
          break;
        case 'Ashby':
          await this.fillAshbyForm();
          break;
        default:
          await this.fillGenericForm();
      }
      
      this.showNotification('Success', 'Form auto-filled! Please review before submitting.');
      return { success: true };
      
    } catch (error: any) {
      console.error('Error filling form:', error);
      this.showNotification('Error', 'Failed to fill form: ' + error.message);
      return { success: false, error: error.message };
    }
  }

  // Greenhouse form auto-fill
  async fillGreenhouseForm() {
    const fields = {
      'first_name': this.userData?.name?.split(' ')[0] || '',
      'last_name': this.userData?.name?.split(' ').slice(1).join(' ') || '',
      'email': this.userData?.email || '',
      'phone': this.userData?.phone || '',
      'linkedin': this.userData?.linkedin || '',
      'website': this.userData?.portfolio || '',
      'github': this.userData?.github || '',
    };

    // Fill text inputs
    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[name*="${fieldName}" i], input[id*="${fieldName}" i]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Handle resume upload
    if (this.userData?.resumeUrl) {
      const fileInput = document.querySelector('input[type="file"][name*="resume" i]') as HTMLInputElement;
      if (fileInput) {
        // Note: File upload requires special handling, show message to user
        this.showNotification('Info', 'Please upload your resume manually - file upload requires manual selection');
      }
    }
  }

  // Lever form auto-fill
  async fillLeverForm() {
    const fields = {
      'name': this.userData?.name || '',
      'email': this.userData?.email || '',
      'phone': this.userData?.phone || '',
      'linkedin': this.userData?.linkedin || '',
      'portfolio': this.userData?.portfolio || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[aria-label*="${fieldName}" i], input[name*="${fieldName}" i], input[data-field="${fieldName}"]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Workday form auto-fill
  async fillWorkdayForm() {
    const fields = {
      'firstName': this.userData?.name?.split(' ')[0] || '',
      'lastName': this.userData?.name?.split(' ').slice(1).join(' ') || '',
      'email': this.userData?.email || '',
      'phone': this.userData?.phone || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[data-automation-id*="${fieldName}" i]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  // LinkedIn form auto-fill
  async fillLinkedInForm() {
    // LinkedIn Easy Apply has limited fields
    const fields = {
      'firstName': this.userData?.name?.split(' ')[0] || '',
      'lastName': this.userData?.name?.split(' ').slice(1).join(' ') || '',
      'emailAddress': this.userData?.email || '',
      'phoneNumber': this.userData?.phone || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Indeed form auto-fill
  async fillIndeedForm() {
    const fields = {
      'applicant.name': this.userData?.name || '',
      'applicant.email': this.userData?.email || '',
      'applicant.phone': this.userData?.phone || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[name*="${fieldName}" i]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Ashby form auto-fill
  async fillAshbyForm() {
    const fields = {
      'name': this.userData?.name || '',
      'email': this.userData?.email || '',
      'phone': this.userData?.phone || '',
      'linkedin': this.userData?.linkedin || '',
      'portfolio': this.userData?.portfolio || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
      const input = document.querySelector(`input[name="${fieldName}"], input[id="${fieldName}"]`) as HTMLInputElement;
      if (input && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Generic form auto-fill (fallback)
  async fillGenericForm() {
    const commonFieldMappings = [
      { keywords: ['first', 'first name', 'firstname'], value: this.userData?.name?.split(' ')[0] },
      { keywords: ['last', 'last name', 'lastname'], value: this.userData?.name?.split(' ').slice(1).join(' ') },
      { keywords: ['full', 'name', 'full name'], value: this.userData?.name },
      { keywords: ['email', 'e-mail'], value: this.userData?.email },
      { keywords: ['phone', 'mobile', 'telephone'], value: this.userData?.phone },
      { keywords: ['linkedin', 'linked-in'], value: this.userData?.linkedin },
      { keywords: ['portfolio', 'website', 'personal website'], value: this.userData?.portfolio },
      { keywords: ['github', 'git'], value: this.userData?.github },
      { keywords: ['location', 'city', 'address'], value: this.userData?.location },
    ];

    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="url"]');
    
    inputs.forEach((input) => {
      const inputElement = input as HTMLInputElement;
      const label = this.getFieldLabel(inputElement).toLowerCase();
      const name = inputElement.name.toLowerCase();
      const id = inputElement.id.toLowerCase();
      const placeholder = inputElement.placeholder.toLowerCase();
      const ariaLabel = inputElement.getAttribute('aria-label')?.toLowerCase() || '';

      for (const mapping of commonFieldMappings) {
        const match = mapping.keywords.some(keyword => 
          label.includes(keyword) || 
          name.includes(keyword) || 
          id.includes(keyword) || 
          placeholder.includes(keyword) || 
          ariaLabel.includes(keyword)
        );

        if (match && mapping.value && !inputElement.value) {
          inputElement.value = mapping.value;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
  }

  getFieldLabel(input: HTMLInputElement): string {
    // Try to find label by 'for' attribute
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent || '';
    }
    
    // Check parent label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.textContent || '';
    
    // Check previous sibling
    const prevSibling = input.previousElementSibling;
    if (prevSibling && prevSibling.tagName === 'LABEL') {
      return prevSibling.textContent || '';
    }
    
    return '';
  }

  extractJobInfo(): JobInfo {
    const url = window.location.href;
    let title = '';
    let company = '';
    let location = '';
    let description = '';

    // Platform-specific extraction
    if (url.includes('greenhouse.io')) {
      title = document.querySelector('h1')?.textContent?.trim() || '';
      company = document.querySelector('[class*="company"]')?.textContent?.trim() || '';
      location = document.querySelector('[class*="location"]')?.textContent?.trim() || '';
    } else if (url.includes('lever.co')) {
      title = document.querySelector('h2')?.textContent?.trim() || '';
      company = document.querySelector('[class*="company"]')?.textContent?.trim() || '';
    } else if (url.includes('linkedin.com')) {
      title = document.querySelector('h1')?.textContent?.trim() || '';
      company = document.querySelector('[class*="company"]')?.textContent?.trim() || '';
      location = document.querySelector('[class*="location"]')?.textContent?.trim() || '';
    }

    // Fallback: try to extract from page title
    if (!title) {
      title = document.title.split(' - ')[0] || document.title.split(' | ')[0] || '';
    }

    // Extract description from meta or page content
    const metaDesc = document.querySelector('meta[name="description"]');
    description = metaDesc?.getAttribute('content') || '';

    return { title, company, location, description, url };
  }

  async trackApplication() {
    const jobInfo = this.extractJobInfo();
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'track-application',
        data: {
          jobTitle: jobInfo.title,
          company: jobInfo.company,
          jobUrl: jobInfo.url,
          platform: this.detectedPlatform || 'Unknown',
          status: 'APPLIED'
        }
      });

      if (response.success) {
        this.showNotification('Tracked', 'Application has been tracked in your dashboard!');
      } else {
        this.showNotification('Error', 'Failed to track application: ' + response.error);
      }
    } catch (error: any) {
      console.error('Error tracking application:', error);
    }
  }

  showNotification(title: string, message: string) {
    chrome.runtime.sendMessage({
      action: 'show-notification',
      title,
      message
    });
  }
}

// Initialize content script
new JobApplyContentScript();
