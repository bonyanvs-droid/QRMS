const fs = require('fs');
const file = 'src/components/admin/PermissionsDelegationTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the start of handleUserDelegationToggle
const startIndex = content.indexOf('  const handleUserDelegationToggle = async (permId: string) => {');
if (startIndex === -1) throw new Error('Not found');

// Find the end of handleUserDelegationToggle (before getGroupStateForRole)
const endIndex = content.indexOf('  const getGroupStateForRole = (group: any) => {');
if (endIndex === -1) throw new Error('End not found');

const replacement = `  const userTempPerms = selectedUser?.temporaryCustomPermissions || [];

  const handleOpenDelegationModal = (permId: string) => {
    if (!selectedUser) return;
    if (baseInheritedPerms.includes(permId) && !userCustomPerms.includes(permId) && !userTempPerms.find(t => t.id === permId)) {
      return;
    }
    
    const existingTemp = userTempPerms.find(t => t.id === permId);
    if (existingTemp) {
      setDelegationExpiryDate(existingTemp.expiresAt.split('T')[0]);
    } else {
      setDelegationExpiryDate(''); // Permanent by default
    }
    
    setDelegationModal({ permId, type: (userCustomPerms.includes(permId) || existingTemp) ? 'edit' : 'grant' });
  };

  const handleSaveDelegation = async () => {
    if (!selectedUser || !delegationModal) return;
    
    const { permId } = delegationModal;
    let newCustom = [...userCustomPerms].filter(p => p !== permId);
    let newTemp = [...userTempPerms].filter(p => p.id !== permId);

    if (delegationExpiryDate) {
      // Temporary
      newTemp.push({
        id: permId,
        expiresAt: new Date(delegationExpiryDate).toISOString(),
      });
    } else {
      // Permanent
      newCustom.push(permId);
    }

    const updatedUser = { 
      ...selectedUser, 
      customPermissions: newCustom,
      temporaryCustomPermissions: newTemp
    };

    try {
      await updateUser(selectedUser.id, updatedUser);
      setSuccessMessage('تم تحديث تفويض المستخدم بنجاح');
      setTimeout(() => setSuccessMessage(''), 2000);
      setDelegationModal(null);
    } catch (e) {
      alert('خطأ أثناء تحديث المستخدم');
    }
  };

  const handleRemoveDelegation = async (permId: string) => {
    if (!selectedUser) return;
    const newCustom = [...userCustomPerms].filter(p => p !== permId);
    const newTemp = [...userTempPerms].filter(p => p.id !== permId);
    
    const updatedUser = { 
      ...selectedUser, 
      customPermissions: newCustom,
      temporaryCustomPermissions: newTemp
    };

    try {
      await updateUser(selectedUser.id, updatedUser);
      setSuccessMessage('تم إزالة التفويض بنجاح');
      setTimeout(() => setSuccessMessage(''), 2000);
      if (delegationModal?.permId === permId) setDelegationModal(null);
    } catch (e) {
      alert('خطأ أثناء تحديث المستخدم');
    }
  };

`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex);
fs.writeFileSync(file, content);
console.log('Fixed handleUserDelegationToggle');
