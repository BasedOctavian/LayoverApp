import { useState } from 'react';

const useActivityCollapse = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return {
    isCollapsed,
    isLoading,
    toggleCollapse,
  };
};

export default useActivityCollapse; 