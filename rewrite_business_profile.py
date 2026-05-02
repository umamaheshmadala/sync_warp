with open('src/components/business/BusinessProfile.tsx', 'r') as f:
    lines = f.readlines()

# Apply state and tabParam updates
for i, line in enumerate(lines):
    if "const [activeTab, setActiveTab] = useState('products');" in line:
        lines.insert(i + 1, "  const [activeProfileTab, setActiveProfileTab] = useState<'business-info' | 'enhanced-profile'>('business-info');\n")
        break

for i, line in enumerate(lines):
    if "['overview', 'products', 'reviews'" in line:
        lines[i] = line.replace("['overview', 'products'", "['overview', 'profile', 'products'")
        break

# Find renderOverview boundaries
overview_start = -1
for i, line in enumerate(lines):
    if line.startswith("  // Render overview tab"):
        overview_start = i
        break

# The Edit Form is exactly from line 805 to 1079 (in the original file).
# Since we added 1 line for the state, we need to find it by text.
edit_form_start = -1
edit_form_end = -1

for i in range(overview_start, len(lines)):
    if "{/* Editing Form - Shown only when editing */}" in lines[i]:
        edit_form_start = i
    if "Cancel" in lines[i] and "</button>" in lines[i + 1] and "</div>" in lines[i + 2] and "</div>" in lines[i + 3] and ")}" in lines[i + 4]:
        edit_form_end = i + 4
        break

# Extract the edit form content, stripping the `{editing && isOwner && (` and `)}` wrappers
# The wrapper starts at edit_form_start + 1 and ends at edit_form_end
edit_form_lines = lines[edit_form_start + 2 : edit_form_end]

profile_tab_header = """  // Render profile tab (Editing and Enhanced Profile)
  const renderProfileTab = () => {
    if (!isOwner) return null;

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveProfileTab('business-info')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeProfileTab === 'business-info'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Business Info
            </button>
            <button
              onClick={() => setActiveProfileTab('enhanced-profile')}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeProfileTab === 'enhanced-profile'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Enhanced Profile
            </button>
          </nav>
        </div>

        {activeProfileTab === 'business-info' && (
"""

profile_tab_footer = """        )}

        {activeProfileTab === 'enhanced-profile' && (
          <EnhancedProfileTab
            businessId={business?.id!}
            business={business!}
            isOwner={isOwner}
            onUpdate={async () => {
              // Refresh business data from cache
              await refetchBusiness();
            }}
          />
        )}
      </div>
    );
  };

"""

# Now we construct the new renderOverview
# We need to find the `{!editing && (` which is shortly after edit_form_end
not_editing_start = -1
for i in range(edit_form_end, len(lines)):
    if "{!editing && (" in lines[i]:
        not_editing_start = i
        break

overview_end = -1
for i in range(not_editing_start, len(lines)):
    if "  // Render statistics tab" in lines[i]:
        # Backtrack to the end of renderOverview
        for j in range(i-1, 0, -1):
            if "  };" in lines[j]:
                overview_end = j
                break
        break

overview_lines = lines[not_editing_start + 2 : overview_end - 1] # Skip {!editing && (\n <>\n and the trailing \n</>\n)}\n</div>

# Fix the category button inside overview_lines
overview_text = "".join(overview_lines)
old_button_click = """                          onClick={() => {
                            setEditing(true);
                            setTimeout(() => {
                              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                            }, 100);
                          }}"""

new_button_click = """                          onClick={() => {
                            setSearchParams(prev => {
                              const newParams = new URLSearchParams(prev);
                              newParams.set('tab', 'profile');
                              return newParams;
                            });
                            setEditing(true);
                            setTimeout(() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 100);
                          }}"""

overview_text = overview_text.replace(old_button_click, new_button_click)

new_overview = """  // Render overview tab (Read-only)
  const renderOverview = () => {
    return (
      <div className="space-y-6">
""" + overview_text + """      </div>
    );
  };
"""

# Construct the full file
new_lines = lines[:overview_start] + [profile_tab_header] + edit_form_lines + [profile_tab_footer] + [new_overview] + lines[overview_end + 1:]

new_content = "".join(new_lines)

# Update buttons mapping to 'overview'
new_content = new_content.replace("newParams.set('tab', 'overview');", "newParams.set('tab', 'profile');")

# Update rendering at bottom
old_render = "{activeTab === 'overview' && renderOverview()}"
new_render = "{activeTab === 'overview' && renderOverview()}\n                {activeTab === 'profile' && renderProfileTab()}"
new_content = new_content.replace(old_render, new_render)

# Remove enhanced-profile tab switch case at the bottom
enhanced_profile_switch = """                {activeTab === 'enhanced-profile' && (
                  <EnhancedProfileTab
                    businessId={business?.id!}
                    business={business!}
                    isOwner={isOwner}
                    onUpdate={async () => {
                      // Refresh business data from cache
                      await refetchBusiness();
                    }}
                  />
                )}
"""
new_content = new_content.replace(enhanced_profile_switch, "")

with open('src/components/business/BusinessProfile.tsx', 'w') as f:
    f.write(new_content)

print("Rewrite complete.")
