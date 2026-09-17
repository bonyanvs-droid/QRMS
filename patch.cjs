const fs = require('fs');
const file = 'src/components/admin/PermissionsDelegationTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  const userCustomPerms = selectedUser?.customPermissions || [];
  const handleUserDelegationToggle = async (permId: string) => {
    if (!selectedUser) return;
    
    // If it's already inherited, we can't toggle it here (they already have it)
    if (baseInheritedPerms.includes(permId) && !userCustomPerms.includes(permId)) {
       return; // Already inherited via role
    }

    let newCustom = [...userCustomPerms];
    if (newCustom.includes(permId)) {
      newCustom = newCustom.filter(p => p !== permId); // Remove
    } else {
      newCustom.push(permId); // Add
    }

    const updatedUser = { ...selectedUser, customPermissions: newCustom };

    try {
      await updateUser(selectedUser.id, updatedUser);
      setSuccessMessage('تم تحديث تفويض المستخدم');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (e) {
      alert('خطأ أثناء تحديث المستخدم');
    }
  };`;

const replacement = `  const userCustomPerms = selectedUser?.customPermissions || [];
  const userTempPerms = selectedUser?.temporaryCustomPermissions || [];

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
  };`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Replaced successfully');
