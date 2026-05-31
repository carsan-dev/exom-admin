import { useEffect } from 'react'
import { create } from 'zustand'

interface UnsavedChangesState {
  dirtyEditors: Record<string, true>
  hasUnsavedChanges: boolean
  setEditorDirty: (id: string, dirty: boolean) => void
}

export const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  dirtyEditors: {},
  hasUnsavedChanges: false,
  setEditorDirty: (id, dirty) =>
    set((state) => {
      const dirtyEditors = { ...state.dirtyEditors }
      if (dirty) dirtyEditors[id] = true
      else delete dirtyEditors[id]

      return {
        dirtyEditors,
        hasUnsavedChanges: Object.keys(dirtyEditors).length > 0,
      }
    }),
}))

export function useUnsavedChanges(id: string, dirty: boolean) {
  const setEditorDirty = useUnsavedChangesStore((state) => state.setEditorDirty)

  useEffect(() => {
    setEditorDirty(id, dirty)
    return () => setEditorDirty(id, false)
  }, [dirty, id, setEditorDirty])
}
