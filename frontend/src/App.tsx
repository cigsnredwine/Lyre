import FollowingPage from "./pages/following/FollowingPage";
import StudioPage from "./pages/studio/StudioPage";
import ProjectPage from "./pages/studio/ProjectPage";
import { Routes, Route } from "react-router-dom"
import HomePage  from "./pages/home/HomePage"
import MainLayout from "./layout/MainLayout"
import ChatPage from "./pages/chat/ChatPage"
import AlbumPage from "./pages/album/AlbumPage"
import AdminPage from "./pages/admin/AdminPage"
import NotFoundPage  from "./pages/404/NotFoundPage"
import AuthPage from "./pages/auth/AuthPage"
import ProfilePage from "./pages/profile/ProfilePage"
import AccountSettingsPage from "./pages/profile/AccountSettingsPage"
import BrowsePage from "./pages/browse/BrowsePage"
import SearchPage from "./pages/search/SearchPage"
import UploadMusicPage from "./pages/upload-music/UploadMusicPage"

import "./styles/redesign.css";

function App() {
  // token =>
  
  return (
    <>
      <Routes>
        <Route path="/login" element={<AuthPage mode="sign-in" />} />
        <Route path="/signup" element={<AuthPage mode="sign-up" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/library-upload" element={<UploadMusicPage />} />
        <Route path="/settings/account" element={<AccountSettingsPage />} />

        <Route element={<MainLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:artistId" element={<ProfilePage />} />
          <Route path="/upload-music" element={<StudioPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/following" element={<FollowingPage />} />
          <Route path='/' element={<HomePage />} />
          <Route path='/chat' element={<ChatPage />} />
          <Route path='/albums/:albumId' element={<AlbumPage />} />
          <Route path='/browse/:sectionId' element={<BrowsePage />} />
          <Route path='/search' element={<SearchPage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
