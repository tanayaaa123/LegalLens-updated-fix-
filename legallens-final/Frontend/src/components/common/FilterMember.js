import React, { useState, useEffect } from "react";
import { Filter, ChevronDown, X } from "lucide-react";
import "../Components.css";
import api from "../../api";

function FilterMember({ onFilterSelect }) {
  const [open, setOpen] = useState(false);
  const [subMenu, setSubMenu] = useState(null);
  const [selected, setSelected] = useState(null);
  const [regionOptions, setRegionOptions] = useState([]);

  const mainOptions = ["Role", "Region", "ID"];
  const roleOptions = [
    { label: "Lead Investigator", value: "Lead_Investigator" },
    { label: "Police Officer", value: "Police_Officer" },
    { label: "Forensic Officer", value: "Forensic_Officer" },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/users/regions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setRegionOptions(data))
      .catch((err) => console.error("Error fetching regions:", err));
  }, []);

  const handleClick = (option) => {
    if (option === "Role" || option === "Region") {
      setSubMenu(option);
    } else {
      handleSelect(option);
    }
  };

  const handleSelect = (value) => {
    setSelected(value);
    if (onFilterSelect) {
      onFilterSelect(value);
    }
    setOpen(false);
    setSubMenu(null);
  };

  const handleReset = () => {
    setSelected(null);
    setOpen(false);
    setSubMenu(null);
    if (onFilterSelect) {
      onFilterSelect(null);
    }
  };

  return (
    <div
      className="filterDropdown"
      style={{ display: "flex", alignItems: "center", gap: "8px" }}
    >
      <button className="funnelBtn" onClick={() => setOpen(!open)}>
        <Filter size={18} />
        {selected && <span style={{ marginLeft: "8px" }}>{selected}</span>}
      </button>

      {selected && (
        <button className="funnelBtn" onClick={handleReset}>
          <X size={16} />
        </button>
      )}

      {open && (
        <div className="dropdownMenu">
          {mainOptions.map((opt) => (
            <div
              key={opt}
              className="dropdownItem"
              onClick={() => handleClick(opt)}
            >
              {opt}
              {(opt === "Role" || opt === "Region") && (
                <ChevronDown className="submenuIcon" size={14} />
              )}
            </div>
          ))}

          {subMenu === "Role" && (
            <div className="subMenu">
              {roleOptions.map((role) => (
                <div
                  key={role.value}
                  className="subMenuItem"
                  onClick={() => handleSelect(role.value)}
                >
                  {role.label}
                </div>
              ))}
            </div>
          )}

          {subMenu === "Region" && (
            <div className="subMenu">
              {regionOptions.length > 0 ? (
                regionOptions.map((region) => (
                  <div
                    key={region}
                    className="subMenuItem"
                    onClick={() => handleSelect(region)}
                  >
                    {region}
                  </div>
                ))
              ) : (
                <div className="subMenuItem">No regions found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterMember;
