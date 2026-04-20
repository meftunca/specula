import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { ContactForm, Login, ModalDemo, Search } from "./components";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>TestWeaver Example App</h1>
        <p>
          This app demonstrates the TestWeaver DSL attributes for automatic test
          generation.
        </p>
      </header>

      <nav className="app-nav">
        <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/login">
          Login Demo
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/search">
          Search Demo
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/contact">
          Contact Demo
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/modal">
          Modal Demo
        </NavLink>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate replace to="/login" />} />
          <Route
            path="/login"
            element={
              <Login
                onSuccess={(email) => console.log("Login successful:", email)}
                onError={(error) => console.log("Login error:", error)}
              />
            }
          />
          <Route
            path="/search"
            element={<Search onSearch={(query) => console.log("Searching for:", query)} />}
          />
          <Route
            path="/contact"
            element={<ContactForm onSubmit={(data) => console.log("Contact submitted:", data)} />}
          />
          <Route path="/modal" element={<ModalDemo />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>
          View the component source code to see how <code>data-test-*</code>{" "}
          attributes are used.
        </p>
      </footer>
    </div>
  );
}

export default App;
