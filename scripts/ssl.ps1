param([String]$pathToPfx,[String]$pathToPfxPwd,[String]$SiteName,[String]$HostName)

#Set-ExecutionPolicy ByPass -Scope CurrentUser

$psLog = "powershell.log"


if(!(Test-Path C:\temp\logs)){
  mkdir C:\temp\logs >$null 2> $psLog
}

# Copy certificate from S3 to Local to temp and install
  try{
    $mypwd = get-content $pathToPfxPwd | ConvertTo-SecureString  -Force -AsPlainText
    Import-PfxCertificate -FilePath $pathToPfx Cert:\LocalMachine\My -Password $mypwd >$null 2>$psLog
  }
  catch{
    Add-Content $psLog -Value $Error[0].Exception
  }


# Remove binding to * if exists
  try{
if(Test-Path IIS:\SslBindings\0.0.0.0!443){
  Get-Item IIS:\SslBindings\0.0.0.0!443 | Remove-Item 2>$psLog
}
 }
  catch{
    Add-Content $psLog -Value $Error[0].Exception
  }
# Create web binding
  try{
if(!(Get-WebBinding -Name $SiteName -Port 443 -Protocol https -HostHeader $HostName)){
  New-WebBinding -Name $SiteName -IPAddress "*" -Port 443 -Protocol https -HostHeader $HostName >$null 2>$psLog
  }
 }
  catch{
    Add-Content $psLog -Value $Error[0].Exception
  }